<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Services;

use App\Models\User;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\Entrega;
use App\Modules\Transferencia\Models\EnvioEtte;
use App\Support\Enums\EstadoEntrega;
use App\Support\Http\ApiResponse;
use App\Support\Services\ContextoTransferencia;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Cadena institucional de las entregas que llegan al ETTS (D-12, RF-71 a RF-75).
 *
 * remitida (al ETTS) → recibida_etts → remitida_ette → recibida_ette. Solo
 * participan los CC sin padre en el Anexo 01: cada uno lleva consigo lo que
 * consolidó su subárbol. El ETTS envía al ETTE por lotes numerados, cada uno con
 * su constancia de entrega; el ETTE registra la recepción y cierra el flujo.
 */
class CadenaEttsEtte
{
    public function __construct(
        private readonly ContextoTransferencia $contexto,
        private readonly ConsolidacionCentroCosto $consolidacion,
    ) {}

    /**
     * Bandeja de los CC que envían al ETTS: estado de su entrega, lote y avance
     * de su subárbol (hijos remitidos, pendientes y enviados tarde).
     *
     * @return list<array<string, mixed>>
     */
    public function bandeja(): array
    {
        $procesoId = $this->contexto->procesoActivoId();
        $centros = Dependencia::query()->centrosCosto()->where('proceso_transferencia_id', $procesoId)
            ->get(['id', 'codigo', 'nombre', 'nivel', 'parent_id', 'es_centro_costo', 'proceso_transferencia_id']);
        $entregas = $this->consolidacion->entregasPorCentro($procesoId, $centros->pluck('id')->all(),
            ['emisor:id,name', 'recibidaEttsPor:id,name', 'envioEtte', 'recibidaEttePor:id,name']);
        $hijasPorPadre = $centros->groupBy('parent_id');

        return $centros->filter(fn (Dependencia $cc): bool => $cc->enviaAEtts())
            ->sortBy('codigo', SORT_NATURAL)->values()
            ->map(function (Dependencia $raiz) use ($entregas, $hijasPorPadre): array {
                $entrega = $entregas->get($raiz->id);
                $estado = $entrega?->estado ?? EstadoEntrega::BORRADOR;
                $subarbol = $this->descendientes($raiz->id, $hijasPorPadre);
                $remitidos = $subarbol->filter(fn (Dependencia $cc): bool => (bool) $entregas->get($cc->id)?->estado->fueRemitida());

                return [
                    'id' => $raiz->id,
                    'codigo' => $raiz->codigo,
                    'nombre' => $raiz->nombre,
                    'nivel' => $raiz->nivel,
                    'estado' => $estado->value,
                    'estado_etiqueta' => $estado->etiqueta(),
                    'remitida_por' => $entrega?->emisor?->name,
                    'remitida_en' => $entrega?->remitida_en?->toIso8601String(),
                    'recibida_etts_por' => $entrega?->recibidaEttsPor?->name,
                    'recibida_etts_en' => $entrega?->recibida_etts_en?->toIso8601String(),
                    'envio_ette' => $entrega?->envioEtte ? [
                        'id' => $entrega->envioEtte->id,
                        'codigo' => $entrega->envioEtte->codigo(),
                    ] : null,
                    'remitida_ette_en' => $entrega?->remitida_ette_en?->toIso8601String(),
                    'recibida_ette_por' => $entrega?->recibidaEttePor?->name,
                    'recibida_ette_en' => $entrega?->recibida_ette_en?->toIso8601String(),
                    'subarbol' => [
                        'total' => $subarbol->count(),
                        'remitidos' => $remitidos->count(),
                        'enviados_tarde' => $subarbol->filter(fn (Dependencia $cc): bool => $this->consolidacion->enviadoTarde($cc, $entregas))->count(),
                    ],
                ];
            })->all();
    }

    /**
     * El ETTS registra la recepción de las entregas que le llegaron (RF-71).
     *
     * @param  list<int>  $dependenciaIds
     * @return Collection<int, Entrega>
     */
    public function recibirEnEtts(array $dependenciaIds, User $usuario): Collection
    {
        return DB::transaction(fn (): Collection => $this->entregasEn($dependenciaIds, EstadoEntrega::REMITIDA,
            'Solo se recibe en el ETTS una entrega remitida por un CC que envía al ETTS')
            ->each(fn (Entrega $entrega) => $entrega->update([
                'estado' => EstadoEntrega::RECIBIDA_ETTS,
                'recibida_etts_en' => Carbon::now(),
                'recibida_etts_por_id' => $usuario->id,
            ])));
    }

    /**
     * El ETTS envía al ETTE un lote de entregas recibidas (RF-73), con número
     * correlativo por proceso y constancia de entrega (RF-75).
     *
     * @param  list<int>  $dependenciaIds
     */
    public function enviarAlEtte(array $dependenciaIds, User $usuario, ?string $comentario = null): EnvioEtte
    {
        return DB::transaction(function () use ($dependenciaIds, $usuario, $comentario): EnvioEtte {
            $entregas = $this->entregasEn($dependenciaIds, EstadoEntrega::RECIBIDA_ETTS,
                'Solo se envía al ETTE una entrega ya recibida por el ETTS');
            $procesoId = $this->contexto->procesoActivoId();
            $ahora = Carbon::now();
            $envio = EnvioEtte::create([
                'proceso_transferencia_id' => $procesoId,
                'numero' => (int) EnvioEtte::where('proceso_transferencia_id', $procesoId)->lockForUpdate()->max('numero') + 1,
                'enviado_por_id' => $usuario->id,
                'enviado_en' => $ahora,
                'comentario' => $comentario,
            ]);
            $entregas->each(fn (Entrega $entrega) => $entrega->update([
                'estado' => EstadoEntrega::REMITIDA_ETTE,
                'envio_ette_id' => $envio->id,
                'remitida_ette_en' => $ahora,
                'remitida_ette_por_id' => $usuario->id,
            ]));

            return $envio->load('entregas.dependencia');
        });
    }

    /**
     * El ETTE registra la recepción (RF-74): estado final de la entrega.
     *
     * @param  list<int>  $dependenciaIds
     * @return Collection<int, Entrega>
     */
    public function recibirEnEtte(array $dependenciaIds, User $usuario): Collection
    {
        return DB::transaction(fn (): Collection => $this->entregasEn($dependenciaIds, EstadoEntrega::REMITIDA_ETTE,
            'Solo se recibe en el ETTE una entrega enviada por el ETTS')
            ->each(fn (Entrega $entrega) => $entrega->update([
                'estado' => EstadoEntrega::RECIBIDA_ETTE,
                'recibida_ette_en' => Carbon::now(),
                'recibida_ette_por_id' => $usuario->id,
            ])));
    }

    /** ¿Todas las entregas de los CC que envían al ETTS ya fueron recibidas por el ETTE? */
    public function cadenaCompleta(int $procesoId): bool
    {
        $raices = Dependencia::query()->centrosCosto()->where('proceso_transferencia_id', $procesoId)
            ->whereNull('parent_id')->pluck('id');

        return $raices->isNotEmpty() && Entrega::where('proceso_transferencia_id', $procesoId)
            ->whereIn('dependencia_id', $raices)->where('estado', EstadoEntrega::RECIBIDA_ETTE->value)
            ->count() === $raices->count();
    }

    /**
     * Entregas de los CC indicados, bloqueadas, que deben estar en el estado
     * esperado y dirigidas al ETTS. Todo o nada: un CC fuera de regla aborta.
     *
     * @param  list<int>  $dependenciaIds
     * @return Collection<int, Entrega>
     */
    private function entregasEn(array $dependenciaIds, EstadoEntrega $esperado, string $mensaje): Collection
    {
        $entregas = Entrega::with('dependencia:id,codigo,nombre')
            ->where('proceso_transferencia_id', $this->contexto->procesoActivoId())
            ->whereIn('dependencia_id', array_unique($dependenciaIds))
            ->whereNull('dependencia_destino_id')
            ->lockForUpdate()->get();

        $validas = $entregas->filter(fn (Entrega $entrega): bool => $entrega->estado === $esperado);
        if ($validas->count() !== count(array_unique($dependenciaIds))) {
            $fuera = $entregas->reject(fn (Entrega $entrega): bool => $entrega->estado === $esperado)
                ->map(fn (Entrega $entrega): string => $entrega->dependencia->codigo.' ('.$entrega->estado->etiqueta().')');
            throw new HttpResponseException(ApiResponse::error(
                $mensaje.($fuera->isNotEmpty() ? '. Fuera de regla: '.$fuera->implode(', ').'.' : '.'),
                409,
            ));
        }

        return $validas->values();
    }

    /**
     * Descendientes del CC (sin incluirlo).
     *
     * @param  Collection<int|string, Collection<int, Dependencia>>  $hijasPorPadre
     * @return Collection<int, Dependencia>
     */
    private function descendientes(int $id, Collection $hijasPorPadre): Collection
    {
        $resultado = collect();
        foreach ($hijasPorPadre->get($id, collect()) as $hija) {
            $resultado = $resultado->push($hija)->merge($this->descendientes($hija->id, $hijasPorPadre));
        }

        return $resultado;
    }
}
