<?php

declare(strict_types=1);

namespace App\Modules\Reportes\Services;

use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\DocumentoFirma;
use App\Modules\Transferencia\Models\FirmaBorrador;
use App\Modules\Transferencia\Models\FirmaSesion;
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

        $depIds = array_column($tablero['dependencias'] ?? [], 'id');

        // Pre-cargar en lote borradores oficiales generados en "PDF y firma"
        $borradores = FirmaBorrador::query()
            ->where('proceso_transferencia_id', $procesoId)
            ->whereIn('dependencia_id', $depIds)
            ->get(['dependencia_id', 'tipo_documento'])
            ->groupBy('dependencia_id')
            ->map(fn ($items) => $items->pluck('tipo_documento')->flip()->all())
            ->all();

        // Pre-cargar en lote firmas digitales suscritas
        $firmadas = FirmaSesion::query()
            ->where('proceso_transferencia_id', $procesoId)
            ->whereIn('dependencia_id', $depIds)
            ->where('estado', 'firmada')
            ->get(['dependencia_id', 'tipo_documento'])
            ->groupBy('dependencia_id')
            ->map(fn ($items) => $items->pluck('tipo_documento')->flip()->all())
            ->all();

        // Pre-cargar en lote documentos formalizados
        $documentosFirmados = DocumentoFirma::query()
            ->where('proceso_transferencia_id', $procesoId)
            ->whereIn('dependencia_id', $depIds)
            ->get(['dependencia_id', 'tipo_documento'])
            ->groupBy('dependencia_id')
            ->map(fn ($items) => $items->pluck('tipo_documento')->flip()->all())
            ->all();

        $resolverEstadoAnexo = function (int $depId, string $tipo, string $estadoEntrega) use ($borradores, $firmadas, $documentosFirmados): string {
            // 1. Si la entrega general está consolidada o el documento está suscrito/formalizado => 'firmado' (Entregado)
            if (
                $estadoEntrega === 'consolidada'
                || isset($firmadas[$depId][$tipo])
                || isset($documentosFirmados[$depId][$tipo])
            ) {
                return 'firmado';
            }

            // 2. Si se generó el PDF oficial en "PDF y firma" => 'generado' (Sí / Avance)
            if (isset($borradores[$depId][$tipo])) {
                return 'generado';
            }

            // 3. Documento no generado aún => 'no_generado' (—)
            return 'no_generado';
        };

        $filas = [];
        foreach ($tablero['dependencias'] ?? [] as $dep) {
            $depId = (int) ($dep['id'] ?? 0);
            $estadoEntrega = (string) ($dep['estado_entrega'] ?? 'borrador');

            $estado02 = $resolverEstadoAnexo($depId, 'anexo02', $estadoEntrega);
            $estado03a = $resolverEstadoAnexo($depId, 'anexo03a', $estadoEntrega);
            $estado03b = $resolverEstadoAnexo($depId, 'anexo03b', $estadoEntrega);
            $estado04 = $resolverEstadoAnexo($depId, 'anexo04', $estadoEntrega);
            $estado05 = $resolverEstadoAnexo($depId, 'anexo05', $estadoEntrega);
            $estado06 = $resolverEstadoAnexo($depId, 'anexo06', $estadoEntrega);

            $estados = [$estado02, $estado03a, $estado03b, $estado04, $estado05, $estado06];
            $completados = count(array_filter($estados, fn ($s) => in_array($s, ['generado', 'firmado'], true)));
            $firmadosCount = count(array_filter($estados, fn ($s) => $s === 'firmado'));

            $porcentajeAvance = $estadoEntrega === 'consolidada'
                ? 100
                : (int) round(($completados / count($estados)) * 100);

            $encargadoNombre = null;
            if (! empty($dep['encargado']) && is_array($dep['encargado'])) {
                $nombres = $dep['encargado']['nombres'] ?? '';
                $apellidos = $dep['encargado']['apellidos'] ?? '';
                $encargadoNombre = trim("{$nombres} {$apellidos}") ?: null;
            }

            $filas[] = [
                'dependencia_id' => $depId,
                'codigo' => (string) ($dep['codigo'] ?? ''),
                'nombre' => (string) ($dep['nombre'] ?? ''),
                'nivel' => (string) ($dep['nivel'] ?? ''),
                'encargado' => $encargadoNombre,
                'estado_entrega' => $estadoEntrega,
                'anexo_02' => $estado02,
                'anexo_03a' => $estado03a,
                'anexo_03b' => $estado03b,
                'anexo_04' => $estado04,
                'anexo_05' => $estado05,
                'anexo_06' => $estado06,
                'anexos_completados' => $completados,
                'anexos_firmados' => $firmadosCount,
                'porcentaje_avance' => $porcentajeAvance,
                'observaciones_vigentes' => (int) ($dep['observaciones'] ?? 0),
                'patrimonio_total' => (int) ($dep['patrimonio_total'] ?? 0),
                'patrimonio_confirmados' => (int) ($dep['patrimonio_confirmados'] ?? 0),
                'patrimonio_porcentaje' => (float) ($dep['patrimonio_porcentaje'] ?? 0),
            ];
        }

        $totalDeps = count($filas);
        $consolidadasCount = (int) ($tablero['metricas']['consolidadas'] ?? count(array_filter($filas, fn ($f) => $f['estado_entrega'] === 'consolidada')));
        $remitidasCount = (int) ($tablero['metricas']['remitidas'] ?? count(array_filter($filas, fn ($f) => $f['estado_entrega'] === 'remitida')));
        $observadasCount = count(array_filter($filas, fn (array $f): bool => $f['observaciones_vigentes'] > 0));
        $borradorCount = (int) ($tablero['metricas']['borrador'] ?? count(array_filter($filas, fn ($f) => in_array($f['estado_entrega'], ['borrador', null, ''], true))));
        $porcentajeAvanceGlobal = $totalDeps > 0 ? (float) round(($consolidadasCount / $totalDeps) * 100, 1) : 0.0;

        $metricas = [
            'total_dependencias' => $totalDeps,
            'consolidadas' => $consolidadasCount,
            'remitidas' => $remitidasCount,
            'observadas' => $observadasCount,
            'borrador' => $borradorCount,
            'porcentaje_avance' => (float) ($tablero['metricas']['porcentaje_avance'] ?? $porcentajeAvanceGlobal),
            'patrimonio' => $tablero['metricas']['patrimonio'] ?? [
                'total_bienes' => 0,
                'verificados' => 0,
                'pendientes' => 0,
                'porcentaje' => 0,
                'valor_total' => 0,
            ],
        ];

        return [
            'generado_en' => Carbon::now()->format('d/m/Y H:i'),
            'metricas' => $metricas,
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
        foreach ($tablero['dependencias'] ?? [] as $dep) {
            $totalBienes = (int) ($dep['patrimonio_total'] ?? 0);
            $confirmados = (int) ($dep['patrimonio_confirmados'] ?? 0);

            // Solo dependencias con bienes patrimoniales aportan a la conciliación.
            if ($totalBienes === 0) {
                continue;
            }

            $filas[] = [
                'dependencia_id' => (int) ($dep['id'] ?? 0),
                'codigo' => (string) ($dep['codigo'] ?? ''),
                'nombre' => (string) ($dep['nombre'] ?? ''),
                'total' => $totalBienes,
                'confirmados' => $confirmados,
                'pendientes' => max(0, $totalBienes - $confirmados),
                'porcentaje' => (float) ($dep['patrimonio_porcentaje'] ?? 0),
            ];
        }

        return [
            'generado_en' => Carbon::now()->format('d/m/Y H:i'),
            'totales' => $tablero['metricas']['patrimonio'] ?? [],
            'filas' => $filas,
        ];
    }

    /**
     * Reporte 3 — Observaciones del coordinador ETTE por centro de costo (D-07,
     * D-13). Son constancia: no se subsanan; solo pueden estar registradas
     * (vigentes, figuran en el Acta 07) o retiradas durante la revisión.
     *
     * @param  list<int>|null  $dependenciaIds
     * @return array{generado_en: string, resumen: array{total: int, registradas: int, retiradas: int, centros_observados: int}, filas: list<array<string, mixed>>}
     */
    public function observaciones(?array $dependenciaIds = null): array
    {
        $observaciones = Observacion::query()
            ->with(['autor:id,name', 'registradaPor:id,name', 'dependencia:id,codigo,nombre'])
            ->where('proceso_transferencia_id', $this->procesoActivoId())
            ->when($dependenciaIds !== null, fn ($query) => $query->whereIn('dependencia_id', $dependenciaIds))
            ->orderBy('created_at')
            ->orderBy('id')
            ->get()
            ->filter(fn (Observacion $observacion): bool => $observacion->dependencia !== null);

        $vigentes = $observaciones->where('estado', EstadoObservacion::REGISTRADA);

        return [
            'generado_en' => Carbon::now()->format('d/m/Y H:i'),
            'resumen' => [
                'total' => $observaciones->count(),
                'registradas' => $vigentes->count(),
                'retiradas' => $observaciones->count() - $vigentes->count(),
                'centros_observados' => $vigentes->pluck('dependencia_id')->unique()->count(),
            ],
            'filas' => $observaciones->map(fn (Observacion $observacion): array => [
                'id' => $observacion->id,
                'dependencia_id' => $observacion->dependencia_id,
                'codigo' => $observacion->dependencia->codigo,
                'nombre' => $observacion->dependencia->nombre,
                'anexo' => $observacion->etiquetaAnexo(),
                'detalle' => $observacion->observable_id === null ? 'Anexo completo' : 'Registro N° '.$observacion->observable_id,
                'descripcion' => $observacion->descripcion,
                'estado' => $observacion->estado->value,
                'estado_etiqueta' => $observacion->estado->etiqueta(),
                'autor' => $observacion->autor?->name,
                'en_calidad_de' => $observacion->en_calidad_de?->etiqueta(),
                'registrada_por' => $observacion->registradaPor?->name,
                'registrada_en' => $observacion->created_at?->format('d/m/Y'),
            ])->values()->all(),
        ];
    }

    private function procesoActivoId(): int
    {
        return (int) (ProcesoTransferencia::where('estado', 'abierto')->value('id') ?? 1);
    }
}
