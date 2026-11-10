<?php

declare(strict_types=1);

namespace App\Modules\Reportes\Services;

use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Modules\Transferencia\Services\TransferenciaService;
use Illuminate\Support\Carbon;

/**
 * Consolidados de apoyo para el módulo de Reportes. Reutiliza el tablero de
 * avance (presencia de anexos por dependencia + conciliación patrimonial). Todo
 * acotado al ámbito del usuario (lista de dependencias).
 *
 * Los reportes comparten la misma acotación para que la vista, el Excel y el PDF
 * rindan exactamente los mismos datos.
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
                'anexo_02' => $presencia['anexo_02'],
                'anexo_03' => $presencia['anexo_03'],
                'anexo_04' => $presencia['anexo_04'],
                'anexo_05' => $presencia['anexo_05'],
                'anexo_06' => $presencia['anexo_06'],
                'anexos_completos' => $dep['anexos_completos'],
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

    private function procesoActivoId(): int
    {
        return (int) (ProcesoTransferencia::where('estado', 'abierto')->value('id') ?? 1);
    }
}
