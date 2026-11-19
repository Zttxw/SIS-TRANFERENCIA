<?php

declare(strict_types=1);

namespace App\Modules\Reportes\Services;

use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\Entrega;
use App\Modules\Transferencia\Models\Observacion;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Modules\Transferencia\Services\TransferenciaService;
use App\Support\Enums\EstadoEntrega;
use Illuminate\Support\Carbon;

/**
 * Consolidados de la transferencia para el módulo de Reportes (F5). Reutiliza el
 * tablero operativo (matriz de anexos + avance + patrimonio) y añade el reporte
 * de observaciones y el de verificación (RF-55). Todo acotado al ámbito del usuario (lista de dependencias).
 *
 * Los reportes comparten la misma acotación para que la vista, el Excel y
 * el PDF rindan exactamente los mismos datos.
 */
class ReportesService
{
    public function __construct(
        private readonly TransferenciaService $transferencia,
    ) {}

    /**
     * Reporte 1 — Matriz de anexos y avance por dependencia. Una fila por
     * centro de costo con el estado de su entrega, la presencia de cada anexo
     * (02–06) y el % de verificación patrimonial.
     *
     * @param  list<int>|null  $dependenciaIds
     * @return array{generado_en: string, metricas: array<string, mixed>, filas: list<array<string, mixed>>}
     */
    public function matrizAnexos(?array $dependenciaIds = null): array
    {
        $procesoId = $this->procesoActivoId();
        $tablero = $this->transferencia->obtenerTableroOperativo($dependenciaIds, $procesoId);

        $filas = [];
        foreach ($tablero['dependencias'] as $dep) {
            $presencia = $this->transferencia->presenciaAnexos($dep['id'], $procesoId);

            $filas[] = [
                'dependencia_id' => $dep['id'],
                'codigo' => $dep['codigo'],
                'nombre' => $dep['nombre'],
                'nivel' => $dep['nivel'],
                'encargado' => $dep['encargado']
                    ? trim("{$dep['encargado']['nombres']} {$dep['encargado']['apellidos']}")
                    : null,
                'estado_entrega' => $dep['estado_entrega'],
                'anexo_02' => $presencia['anexo_02'],
                'anexo_03' => $presencia['anexo_03'],
                'anexo_04' => $presencia['anexo_04'],
                'anexo_05' => $presencia['anexo_05'],
                'anexo_06' => $presencia['anexo_06'],
                'observaciones' => $dep['observaciones'],
                'patrimonio_total' => $dep['patrimonio_total'],
                'patrimonio_confirmados' => $dep['patrimonio_confirmados'],
                'patrimonio_porcentaje' => $dep['patrimonio_porcentaje'],
            ];
        }

        return [
            'generado_en' => Carbon::now()->format('d/m/Y H:i'),
            'metricas' => $tablero['metricas'],
            'filas' => $filas,
        ];
    }

    /**
     * Reporte 2 — Conciliación patrimonial. Resumen SIGA por dependencia:
     * total de bienes, verificados, pendientes y % de avance.
     *
     * @param  list<int>|null  $dependenciaIds
     * @return array{generado_en: string, totales: array<string, mixed>, filas: list<array<string, mixed>>}
     */
    public function conciliacionPatrimonial(?array $dependenciaIds = null): array
    {
        $procesoId = $this->procesoActivoId();
        $tablero = $this->transferencia->obtenerTableroOperativo($dependenciaIds, $procesoId);

        $filas = [];
        foreach ($tablero['dependencias'] as $dep) {
            // Solo dependencias con bienes patrimoniales aportan a la conciliación.
            if ($dep['patrimonio_total'] === 0) {
                continue;
            }

            $filas[] = [
                'dependencia_id' => $dep['id'],
                'codigo' => $dep['codigo'],
                'nombre' => $dep['nombre'],
                'total' => $dep['patrimonio_total'],
                'confirmados' => $dep['patrimonio_confirmados'],
                'pendientes' => max(0, $dep['patrimonio_total'] - $dep['patrimonio_confirmados']),
                'porcentaje' => $dep['patrimonio_porcentaje'],
            ];
        }

        return [
            'generado_en' => Carbon::now()->format('d/m/Y H:i'),
            'totales' => $tablero['metricas']['patrimonio'],
            'filas' => $filas,
        ];
    }

    /**
     * Reporte 3 — Observaciones por dependencia: las que dejó el coordinador ETTE
     * como constancia (D-07), con su anexo, autor y calidad.
     *
     * @param  list<int>|null  $dependenciaIds
     * @return array{generado_en: string, resumen: array<string, int>, filas: list<array<string, mixed>>}
     */
    public function observaciones(?array $dependenciaIds = null): array
    {
        $procesoId = $this->procesoActivoId();

        // Mapa dependencia_id → código/nombre dentro del ámbito.
        $depQuery = Dependencia::query()->where('proceso_transferencia_id', $procesoId);
        if ($dependenciaIds !== null) {
            $depQuery->whereIn('id', $dependenciaIds);
        }
        $deps = $depQuery->get(['id', 'codigo', 'nombre'])->keyBy('id');

        $observaciones = Observacion::query()
            ->with('autor')
            ->vigentes()
            ->where('proceso_transferencia_id', $procesoId)
            ->whereIn('dependencia_id', $deps->keys())
            ->orderBy('created_at')
            ->get();

        $filas = [];

        foreach ($observaciones as $obs) {
            $dep = $deps->get($obs->dependencia_id);

            $filas[] = [
                'dependencia_id' => $dep->id,
                'codigo' => $dep->codigo,
                'nombre' => $dep->nombre,
                'anexo' => $obs->etiquetaAnexo().($obs->observable_id === null ? ' (anexo completo)' : ''),
                'descripcion' => $obs->descripcion,
                'autor' => $obs->autor?->name,
                'en_calidad_de' => $obs->en_calidad_de?->etiqueta(),
                'registrada_en' => $obs->created_at?->format('d/m/Y'),
            ];
        }

        return [
            'generado_en' => Carbon::now()->format('d/m/Y H:i'),
            'resumen' => [
                'observaciones' => count($filas),
                'centros_costo' => count(array_unique(array_column($filas, 'dependencia_id'))),
            ],
            'filas' => $filas,
        ];
    }

    /**
     * Reporte 4 — Resultado de la verificación por CC (RF-55): lo que el
     * coordinador ETTE informa al comité. Por cada centro de costo, el estado de
     * su entrega, los anexos sin registros (faltantes), los bienes sin
     * conformidad (inconsistencias patrimoniales), las observaciones registradas
     * y la constancia de aceptación (RF-54, RF-56).
     *
     * @param  list<int>|null  $dependenciaIds
     * @return array{generado_en: string, resumen: array<string, int>, filas: list<array<string, mixed>>}
     */
    public function verificacion(?array $dependenciaIds = null): array
    {
        $procesoId = $this->procesoActivoId();
        $tablero = $this->transferencia->obtenerTableroOperativo($dependenciaIds, $procesoId);
        $entregas = Entrega::with('verificadaPor:id,name')
            ->where('proceso_transferencia_id', $procesoId)
            ->whereIn('dependencia_id', array_column($tablero['dependencias'], 'id'))
            ->get()
            ->keyBy('dependencia_id');

        $filas = [];
        foreach ($tablero['dependencias'] as $dep) {
            $presencia = $this->transferencia->presenciaAnexos($dep['id'], $procesoId);
            $faltantes = [];
            foreach (['anexo_02', 'anexo_03', 'anexo_04', 'anexo_05', 'anexo_06'] as $anexo) {
                if (! $presencia[$anexo]) {
                    $faltantes[] = 'Anexo '.substr($anexo, -2);
                }
            }
            $entrega = $entregas->get($dep['id']);

            $filas[] = [
                'dependencia_id' => $dep['id'],
                'codigo' => $dep['codigo'],
                'nombre' => $dep['nombre'],
                'estado_entrega' => $dep['estado_entrega'],
                'estado_etiqueta' => EstadoEntrega::from($dep['estado_entrega'])->etiqueta(),
                'anexos_faltantes' => $faltantes,
                'bienes_sin_conformidad' => max(0, $dep['patrimonio_total'] - $dep['patrimonio_confirmados']),
                'observaciones' => $dep['observaciones'],
                'verificada_en' => $entrega?->verificada_en?->format('d/m/Y H:i'),
                'verificada_por' => $entrega?->verificadaPor?->name,
                'en_calidad_de' => $entrega?->verificada_en_calidad_de?->etiqueta(),
                'resultado_verificacion' => $entrega?->resultado_verificacion,
            ];
        }

        $metricas = $tablero['metricas'];

        return [
            'generado_en' => Carbon::now()->format('d/m/Y H:i'),
            'resumen' => [
                'centros_costo' => $metricas['total_dependencias'],
                'sin_presentar' => $metricas['borrador'],
                'en_revision' => $metricas['en_revision'],
                'aceptadas' => $metricas['verificadas'] + $metricas['remitidas'],
            ],
            'filas' => $filas,
        ];
    }

    private function procesoActivoId(): int
    {
        return (int) (ProcesoTransferencia::where('estado', 'abierto')->value('id') ?? 1);
    }
}
