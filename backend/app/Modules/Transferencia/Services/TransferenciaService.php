<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Services;

use App\Models\User;
use App\Modules\Acervo\Models\AcervoDocumental;
use App\Modules\Gestion\Models\InformeGestion;
use App\Modules\NoPatrimonial\Models\BienNoPatrimonial;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Patrimonio\Models\BienPatrimonial;
use App\Modules\Personal\Models\Personal;
use App\Modules\Transferencia\Models\ActaTransferencia;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\EstadoVerificacionBien;
use Illuminate\Support\Carbon;

/**
 * Apoyo a la generación de los anexos de transferencia.
 *
 * El sistema NO orquesta el flujo jerárquico de remisión/consolidación (eso lo
 * lleva el SGD): es una herramienta para que cada centro de costo complete sus
 * anexos y genere los PDF oficiales. Por eso este service solo ofrece:
 *  - el avance de los anexos de una dependencia (para el dashboard),
 *  - un tablero de avance institucional (para la visión global de admin/ETTS),
 *  - la materialización del Acta (Anexo 07) con datos, sin gate de estado.
 */
class TransferenciaService
{
    /**
     * Tablero de avance institucional de los anexos (visión global). Una fila
     * por dependencia con el avance de verificación patrimonial y la presencia
     * de cada anexo. Acotado al ámbito del usuario.
     *
     * @param  list<int>|null  $dependenciaIds
     * @return array<string, mixed>
     */
    public function obtenerTableroOperativo(?array $dependenciaIds = null, ?int $procesoId = null): array
    {
        $procesoId = $procesoId ?? $this->resolverProcesoActivoId();

        $query = Dependencia::query()
            ->with(['encargado'])
            ->where('proceso_transferencia_id', $procesoId);

        if ($dependenciaIds !== null) {
            $query->whereIn('id', $dependenciaIds);
        }

        $dependencias = $query->orderBy('codigo')->get();
        $ids = $dependencias->pluck('id')->all();

        // Bienes patrimoniales asignados / confirmados por dependencia.
        $bienesTotals = BienPatrimonial::query()
            ->where('proceso_transferencia_id', $procesoId)
            ->whereIn('dependencia_id', $ids)
            ->selectRaw('dependencia_id, count(*) as total')
            ->groupBy('dependencia_id')
            ->pluck('total', 'dependencia_id');

        $bienesConfirmados = BienPatrimonial::query()
            ->where('proceso_transferencia_id', $procesoId)
            ->whereIn('dependencia_id', $ids)
            ->whereHas('verificacion', fn ($q) => $q->where('estado', EstadoVerificacionBien::CONFIRMADO->value))
            ->selectRaw('dependencia_id, count(*) as total')
            ->groupBy('dependencia_id')
            ->pluck('total', 'dependencia_id');

        $items = $dependencias->map(function ($dep) use ($bienesTotals, $bienesConfirmados, $procesoId) {
            $totalBienes = (int) ($bienesTotals->get($dep->id) ?? 0);
            $confirmados = (int) ($bienesConfirmados->get($dep->id) ?? 0);
            $porcPatrimonio = $totalBienes > 0 ? round(($confirmados / $totalBienes) * 100, 1) : 100.0;

            $presencia = $this->presenciaAnexos($dep->id, $procesoId);

            return [
                'id' => $dep->id,
                'codigo' => $dep->codigo,
                'nombre' => $dep->nombre,
                'nivel' => $dep->nivel,
                'parent_id' => $dep->parent_id,
                'encargado' => $dep->encargado ? [
                    'id' => $dep->encargado->id,
                    'nombres' => $dep->encargado->nombres,
                    'apellidos' => $dep->encargado->apellidos,
                    'cargo' => $dep->encargado->cargo,
                ] : null,
                'anexos' => $presencia,
                'anexos_completos' => count(array_filter($presencia)),
                'patrimonio_total' => $totalBienes,
                'patrimonio_confirmados' => $confirmados,
                'patrimonio_porcentaje' => $porcPatrimonio,
            ];
        });

        $total = $dependencias->count();

        // Totales patrimoniales del ámbito.
        $patrimonioQuery = BienPatrimonial::query()->where('proceso_transferencia_id', $procesoId);
        if ($dependenciaIds !== null) {
            $patrimonioQuery->whereIn('dependencia_id', $dependenciaIds);
        }
        $patTotal = (int) (clone $patrimonioQuery)->count();
        $patVerificados = (int) (clone $patrimonioQuery)->whereHas('verificacion', fn ($q) => $q->where('estado', EstadoVerificacionBien::CONFIRMADO->value))->count();
        $patValor = (float) (clone $patrimonioQuery)->sum('valor');

        return [
            'metricas' => [
                'total_dependencias' => $total,
                'patrimonio' => [
                    'total_bienes' => $patTotal,
                    'verificados' => $patVerificados,
                    'pendientes' => max(0, $patTotal - $patVerificados),
                    'porcentaje' => $patTotal > 0 ? round(($patVerificados / $patTotal) * 100, 1) : 0,
                    'valor_total' => $patValor,
                ],
            ],
            'dependencias' => $items->values()->all(),
        ];
    }

    /**
     * Avance de los anexos de una dependencia (para el dashboard de «mi entrega»).
     *
     * @return array<string, mixed>
     */
    public function obtenerEstadoEntrega(int $dependenciaId, ?int $procesoId = null): array
    {
        $procesoId = $procesoId ?? $this->resolverProcesoActivoId();
        $dep = Dependencia::findOrFail($dependenciaId);

        // Anexo 02 (Gestión)
        $informe = InformeGestion::where('dependencia_id', $dependenciaId)
            ->where('proceso_transferencia_id', $procesoId)
            ->first();

        // Anexo 03 (Acervo)
        $totalAcervo = AcervoDocumental::where('dependencia_id', $dependenciaId)
            ->where('proceso_transferencia_id', $procesoId)
            ->count();

        // Anexo 04 (Patrimonio)
        $totalBienes = BienPatrimonial::where('dependencia_id', $dependenciaId)
            ->where('proceso_transferencia_id', $procesoId)
            ->count();
        $bienesVerificados = BienPatrimonial::where('dependencia_id', $dependenciaId)
            ->where('proceso_transferencia_id', $procesoId)
            ->whereHas('verificacion', fn ($q) => $q->where('estado', EstadoVerificacionBien::CONFIRMADO->value))
            ->count();
        $bienesPendientes = BienPatrimonial::where('dependencia_id', $dependenciaId)
            ->where('proceso_transferencia_id', $procesoId)
            ->whereHas('verificacion', fn ($q) => $q->where('estado', EstadoVerificacionBien::PENDIENTE->value))
            ->count();

        // Anexo 05 (Personal)
        $totalPersonal = Personal::where('dependencia_id', $dependenciaId)
            ->where('proceso_transferencia_id', $procesoId)
            ->count();

        // Anexo 06 (No Patrimonial)
        $totalNoPatrimonial = BienNoPatrimonial::where('dependencia_id', $dependenciaId)
            ->where('proceso_transferencia_id', $procesoId)
            ->count();

        return [
            'dependencia' => [
                'id' => $dep->id,
                'codigo' => $dep->codigo,
                'nombre' => $dep->nombre,
                'nivel' => $dep->nivel,
                'parent_id' => $dep->parent_id,
            ],
            'anexo02_gestion' => [
                'existe' => $informe !== null,
                'estado' => $informe?->estado ?? 'pendiente',
            ],
            'anexo03_acervo' => [
                'total_series' => $totalAcervo,
            ],
            'anexo04_patrimonio' => [
                'total_bienes' => $totalBienes,
                'confirmados' => $bienesVerificados,
                'pendientes' => $bienesPendientes,
                'porcentaje_avance' => $totalBienes > 0 ? round(($bienesVerificados / $totalBienes) * 100, 1) : 100.0,
            ],
            'anexo05_personal' => [
                'total_personal' => $totalPersonal,
            ],
            'anexo06_nopatrimonial' => [
                'total_bienes' => $totalNoPatrimonial,
            ],
        ];
    }

    /**
     * Materializa o consulta el Acta (Anexo 07) de una dependencia con los datos
     * disponibles. No exige estado de entrega: el acta es un entregable más que
     * el sistema genera para la firma física.
     */
    public function obtenerActa(int $dependenciaId, ?User $usuario = null): ActaTransferencia
    {
        $procesoId = $this->resolverProcesoActivoId();
        $dep = Dependencia::findOrFail($dependenciaId);

        $anexos = $this->presenciaAnexos($dep->id, $procesoId);

        $acta = ActaTransferencia::firstOrNew([
            'proceso_transferencia_id' => $procesoId,
            'dependencia_id' => $dep->id,
        ]);

        $acta->fill([
            'numero_acta' => $acta->numero_acta ?? 'ACTA-'.Carbon::now()->year.'-'.str_replace('.', '', (string) $dep->codigo),
            'fecha_acta' => $acta->fecha_acta ?? Carbon::now()->toDateString(),
            'intervinientes' => $acta->intervinientes ?? [
                'titular_saliente' => null,
                'titular_entrante' => null,
            ],
            'anexos_entregados' => $anexos,
            'estado' => $acta->estado === 'suscrita' ? 'suscrita' : 'generada',
            'generada_por_id' => $usuario?->id ?? $acta->generada_por_id,
        ]);
        $acta->save();

        return $acta->load(['evidencias.subidoPor', 'generadaPor', 'dependencia']);
    }

    /**
     * Presencia real de cada anexo para una dependencia. Un anexo cuenta como
     * «completo» si existe al menos un registro suyo.
     *
     * @return array<string, bool>
     */
    public function presenciaAnexos(int $dependenciaId, ?int $procesoId = null): array
    {
        $procesoId = $procesoId ?? $this->resolverProcesoActivoId();
        $estado = $this->obtenerEstadoEntrega($dependenciaId, $procesoId);

        return [
            'anexo_02' => (bool) ($estado['anexo02_gestion']['existe'] ?? false),
            'anexo_03' => ($estado['anexo03_acervo']['total_series'] ?? 0) > 0,
            'anexo_04' => ($estado['anexo04_patrimonio']['total_bienes'] ?? 0) > 0,
            'anexo_05' => ($estado['anexo05_personal']['total_personal'] ?? 0) > 0,
            'anexo_06' => ($estado['anexo06_nopatrimonial']['total_bienes'] ?? 0) > 0,
        ];
    }

    private function resolverProcesoActivoId(): int
    {
        return (int) (ProcesoTransferencia::where('estado', 'abierto')->value('id') ?? 1);
    }
}
