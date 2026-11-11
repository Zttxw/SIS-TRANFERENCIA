<?php

declare(strict_types=1);

namespace App\Modules\Reportes\Services;

use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\Observacion;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Modules\Transferencia\Services\TransferenciaService;
use App\Support\Enums\EstadoObservacion;
use Illuminate\Support\Carbon;

/**
 * Consolidados de la transferencia para el módulo de Reportes (F5). Reutiliza el
 * tablero operativo (matriz de anexos + avance + patrimonio) y añade el reporte
 * de observaciones. Todo acotado al ámbito del usuario (lista de dependencias).
 *
 * Los tres reportes comparten la misma acotación para que la vista, el Excel y
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
                'observaciones_abiertas' => $dep['observaciones_abiertas'],
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
     * Reporte 3 — Observaciones por dependencia. Pliego de observaciones con su
     * estado y, para las subsanadas, los días que tomó la subsanación.
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
            ->where('proceso_transferencia_id', $procesoId)
            ->orderBy('created_at')
            ->get();

        $resumen = ['abiertas' => 0, 'en_subsanacion' => 0, 'subsanadas' => 0, 'desestimadas' => 0];
        $filas = [];

        foreach ($observaciones as $obs) {
            $modelo = $obs->observable_type;
            if (! class_exists($modelo)) {
                continue;
            }
            $depId = $modelo::where('id', $obs->observable_id)->value('dependencia_id');
            $dep = $depId ? $deps->get($depId) : null;

            // Fuera del ámbito del usuario: la observación no pertenece a una
            // dependencia visible, se omite.
            if ($dep === null) {
                continue;
            }

            $this->contarEstado($resumen, $obs->estado);

            $dias = null;
            if ($obs->estado === EstadoObservacion::SUBSANADA && $obs->subsanada_en) {
                $dias = (int) $obs->created_at->diffInDays($obs->subsanada_en);
            }

            $filas[] = [
                'dependencia_id' => $dep->id,
                'codigo' => $dep->codigo,
                'nombre' => $dep->nombre,
                'anexo' => $this->etiquetaAnexo($modelo),
                'descripcion' => $obs->descripcion,
                'estado' => $obs->estado->value,
                'estado_etiqueta' => $obs->estado->etiqueta(),
                'autor' => $obs->autor?->name,
                'registrada_en' => $obs->created_at?->format('d/m/Y'),
                'dias_subsanacion' => $dias,
            ];
        }

        return [
            'generado_en' => Carbon::now()->format('d/m/Y H:i'),
            'resumen' => $resumen,
            'filas' => $filas,
        ];
    }

    /** @param array<string, int> $resumen */
    private function contarEstado(array &$resumen, EstadoObservacion $estado): void
    {
        match ($estado) {
            EstadoObservacion::ABIERTA => $resumen['abiertas']++,
            EstadoObservacion::EN_SUBSANACION => $resumen['en_subsanacion']++,
            EstadoObservacion::SUBSANADA => $resumen['subsanadas']++,
            EstadoObservacion::DESESTIMADA => $resumen['desestimadas']++,
        };
    }

    /** Etiqueta legible del anexo a partir del modelo observable. */
    private function etiquetaAnexo(string $modelo): string
    {
        return match (class_basename($modelo)) {
            'InformeGestion' => 'Anexo 02 — Informe de Gestión',
            'AcervoDocumental' => 'Anexo 03 — Acervo',
            'BienPatrimonial' => 'Anexo 04 — Patrimonio',
            'Personal' => 'Anexo 05 — Personal',
            'BienNoPatrimonial' => 'Anexo 06 — No Patrimonial',
            default => class_basename($modelo),
        };
    }

    private function procesoActivoId(): int
    {
        return (int) (ProcesoTransferencia::where('estado', 'abierto')->value('id') ?? 1);
    }
}
