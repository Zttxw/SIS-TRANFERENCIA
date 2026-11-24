<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Services;

use App\Modules\Acervo\Models\AcervoDocumental;
use App\Modules\Gestion\Models\InformeGestion;
use App\Modules\NoPatrimonial\Models\BienNoPatrimonial;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Patrimonio\Models\BienPatrimonial;
use App\Modules\Personal\Models\Personal;
use App\Modules\Transferencia\Models\Entrega;
use App\Modules\Transferencia\Models\Observacion;
use App\Support\Enums\EstadoEntrega;
use Illuminate\Support\Collection;

/**
 * Consolidación del CC padre (D-08, RF-43): el padre ve lo que envían los CC de
 * su subárbol, con el autor y el CC de origen de cada entrega, pero no lo
 * observa, no lo devuelve ni cambia sus datos. Puede remitir aunque falte algún
 * hijo directo; el hijo que envía después queda marcado como "enviado tarde".
 */
class ConsolidacionCentroCosto
{
    /**
     * CC hijos directos que aún no remiten su entrega.
     *
     * @return list<array{id: int, codigo: string, nombre: string, estado: string}>
     */
    public function hijosPendientes(Dependencia $padre): array
    {
        $hijos = Dependencia::query()->centrosCosto()->where('parent_id', $padre->id)
            ->where('proceso_transferencia_id', $padre->proceso_transferencia_id)->get();
        $entregas = $this->entregasPorCentro($padre->proceso_transferencia_id, $hijos->pluck('id')->all());

        return $hijos->sortBy('codigo', SORT_NATURAL)
            ->reject(fn (Dependencia $hijo): bool => (bool) $entregas->get($hijo->id)?->estado->fueRemitida())
            ->map(fn (Dependencia $hijo): array => [
                'id' => $hijo->id,
                'codigo' => (string) $hijo->codigo,
                'nombre' => (string) $hijo->nombre,
                'estado' => ($entregas->get($hijo->id)?->estado ?? EstadoEntrega::BORRADOR)->value,
            ])->values()->all();
    }

    /**
     * ¿El hijo remitió después de que su padre ya había remitido?
     *
     * @param  Collection<int, Entrega>  $entregas  entregas del proceso por dependencia_id
     */
    public function enviadoTarde(Dependencia $centro, Collection $entregas): bool
    {
        $propia = $entregas->get($centro->id);
        $delPadre = $centro->parent_id ? $entregas->get($centro->parent_id) : null;

        return $propia?->remitida_en !== null && $delPadre?->remitida_en !== null
            && $propia->estado->fueRemitida() && $delPadre->estado->fueRemitida()
            && $propia->remitida_en->greaterThan($delPadre->remitida_en);
    }

    /**
     * El CC y su subárbol, con el estado de cada entrega, quién la cerró para
     * firma y quién la remitió (autoría, RF-43) y el volumen de cada anexo.
     *
     * @return array{centro: array<string, mixed>, centros: list<array<string, mixed>>,
     *     resumen: array{total: int, remitidos: int, pendientes: int, enviados_tarde: int}}
     */
    public function consolidado(Dependencia $centro): array
    {
        $procesoId = $centro->proceso_transferencia_id;
        $ids = $centro->idsSubarbol();
        $centros = Dependencia::query()->centrosCosto()->whereIn('id', $ids)
            ->with('padre:id,codigo,nombre')->get()->sortBy('codigo', SORT_NATURAL)->values();
        $entregas = $this->entregasPorCentro($procesoId, $ids, ['presentadaPor:id,name', 'emisor:id,name']);
        $volumen = $this->volumenAnexos($procesoId, $ids);

        $filas = $centros->map(function (Dependencia $cc) use ($centro, $entregas, $volumen): array {
            $entrega = $entregas->get($cc->id);
            $estado = $entrega?->estado ?? EstadoEntrega::BORRADOR;

            return [
                'id' => $cc->id,
                'codigo' => $cc->codigo,
                'nombre' => $cc->nombre,
                'nivel' => $cc->nivel,
                'es_propio' => $cc->id === $centro->id,
                'padre' => $cc->padre ? ['id' => $cc->padre->id, 'codigo' => $cc->padre->codigo, 'nombre' => $cc->padre->nombre] : null,
                'estado' => $estado->value,
                'estado_etiqueta' => $estado->etiqueta(),
                'presentada_por' => $entrega?->presentadaPor?->name,
                'presentada_en' => $entrega?->presentada_en?->toIso8601String(),
                'remitida_por' => $entrega?->emisor?->name,
                'remitida_en' => $entrega?->remitida_en?->toIso8601String(),
                'enviado_tarde' => $this->enviadoTarde($cc, $entregas),
                'anexos' => [
                    'anexo02' => (bool) ($volumen['informes'][$cc->id] ?? false),
                    'anexo03' => (int) ($volumen['acervo'][$cc->id] ?? 0),
                    'anexo04' => (int) ($volumen['bienes'][$cc->id] ?? 0),
                    'anexo05' => (int) ($volumen['personal'][$cc->id] ?? 0),
                    'anexo06' => (int) ($volumen['no_patrimoniales'][$cc->id] ?? 0),
                ],
                'observaciones' => (int) ($volumen['observaciones'][$cc->id] ?? 0),
            ];
        });

        $remitidos = $filas->filter(fn (array $fila): bool => EstadoEntrega::from($fila['estado'])->fueRemitida())->count();

        return [
            'centro' => ['id' => $centro->id, 'codigo' => $centro->codigo, 'nombre' => $centro->nombre],
            'centros' => $filas->all(),
            'resumen' => [
                'total' => $filas->count(),
                'remitidos' => $remitidos,
                'pendientes' => $filas->count() - $remitidos,
                'enviados_tarde' => $filas->where('enviado_tarde', true)->count(),
            ],
        ];
    }

    /**
     * @param  list<int>  $ids
     * @param  list<string>  $relaciones
     * @return Collection<int, Entrega>
     */
    public function entregasPorCentro(int $procesoId, array $ids, array $relaciones = []): Collection
    {
        return Entrega::query()->with($relaciones)
            ->where('proceso_transferencia_id', $procesoId)->whereIn('dependencia_id', $ids)
            ->get()->keyBy('dependencia_id');
    }

    /**
     * Registros de cada anexo por CC, en una consulta agrupada por anexo.
     *
     * @param  list<int>  $ids
     * @return array<string, Collection<int, int>>
     */
    private function volumenAnexos(int $procesoId, array $ids): array
    {
        $contar = fn (string $modelo) => $modelo::query()->where('proceso_transferencia_id', $procesoId)
            ->whereIn('dependencia_id', $ids)->selectRaw('dependencia_id, count(*) as total')
            ->groupBy('dependencia_id')->pluck('total', 'dependencia_id');

        return [
            // El informe cuenta cuando el responsable lo guardó con funciones (fase 5).
            'informes' => InformeGestion::query()->where('proceso_transferencia_id', $procesoId)
                ->whereIn('dependencia_id', $ids)->get(['dependencia_id', 'funciones'])
                ->mapWithKeys(fn (InformeGestion $informe): array => [$informe->dependencia_id => ! empty($informe->funciones)]),
            'acervo' => $contar(AcervoDocumental::class),
            'bienes' => $contar(BienPatrimonial::class),
            'personal' => $contar(Personal::class),
            'no_patrimoniales' => $contar(BienNoPatrimonial::class),
            'observaciones' => Observacion::query()->vigentes()->where('proceso_transferencia_id', $procesoId)
                ->whereIn('dependencia_id', $ids)->selectRaw('dependencia_id, count(*) as total')
                ->groupBy('dependencia_id')->pluck('total', 'dependencia_id'),
        ];
    }
}
