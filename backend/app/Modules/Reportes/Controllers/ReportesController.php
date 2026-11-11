<?php

declare(strict_types=1);

namespace App\Modules\Reportes\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Reportes\Excel\ConciliacionPatrimonialExport;
use App\Modules\Reportes\Excel\MatrizAnexosExport;
use App\Modules\Reportes\Excel\ObservacionesExport;
use App\Modules\Reportes\Services\ReportesService;
use App\Support\Concerns\AutorizaAmbito;
use App\Support\Http\ApiResponse;
use App\Support\Services\PdfService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Módulo de Reportes (F5). Expone tres consolidados de la transferencia (matriz
 * de anexos, conciliación patrimonial, observaciones) en JSON para la vista y en
 * Excel/PDF para descarga. Todo acotado al ámbito del usuario: los listados usan
 * `idsDependenciaEnAmbito` (null = visión global para admin/ETTS/ETTE).
 */
class ReportesController extends Controller
{
    use AutorizaAmbito;

    /** Reportes válidos y su etiqueta oficial. */
    private const REPORTES = [
        'matriz-anexos' => 'Reporte — Matriz de Anexos y Avance por Dependencia',
        'conciliacion-patrimonial' => 'Reporte — Conciliación Patrimonial (SIGA)',
        'observaciones' => 'Reporte — Observaciones por Dependencia',
    ];

    public function __construct(
        private readonly ReportesService $reportes,
        private readonly PdfService $pdf,
    ) {}

    /**
     * Devuelve el consolidado en JSON para la vista de Reportes.
     */
    public function mostrar(Request $request, string $reporte): JsonResponse
    {
        abort_unless(array_key_exists($reporte, self::REPORTES), 404, 'Reporte no encontrado.');

        $ambito = $this->idsDependenciaEnAmbito($request->user());
        $datos = $this->datos($reporte, $ambito);

        return ApiResponse::success($datos, self::REPORTES[$reporte]);
    }

    /**
     * Exporta el consolidado a Excel (por defecto) o PDF.
     */
    public function exportar(Request $request, string $reporte): BinaryFileResponse|StreamedResponse
    {
        abort_unless(array_key_exists($reporte, self::REPORTES), 404, 'Reporte no encontrado.');

        $formato = $request->query('formato', 'excel');
        abort_unless(in_array($formato, ['excel', 'pdf'], true), 422, 'Formato no soportado (excel|pdf).');

        $ambito = $this->idsDependenciaEnAmbito($request->user());
        $datos = $this->datos($reporte, $ambito);
        $sello = Carbon::now()->format('Ymd-His');

        if ($formato === 'excel') {
            return Excel::download(
                $this->excelExport($reporte, $datos),
                "reporte-{$reporte}-{$sello}.xlsx",
            );
        }

        return $this->pdf->descargar(
            'pdf.reporte',
            $this->modeloPdf($reporte, $datos),
            "reporte-{$reporte}-{$sello}.pdf",
            'a4',
            'landscape',
        );
    }

    /**
     * @param  list<int>|null  $ambito
     * @return array<string, mixed>
     */
    private function datos(string $reporte, ?array $ambito): array
    {
        return match ($reporte) {
            'matriz-anexos' => $this->reportes->matrizAnexos($ambito),
            'conciliacion-patrimonial' => $this->reportes->conciliacionPatrimonial($ambito),
            'observaciones' => $this->reportes->observaciones($ambito),
        };
    }

    /** @param array<string, mixed> $datos */
    private function excelExport(string $reporte, array $datos): object
    {
        return match ($reporte) {
            'matriz-anexos' => new MatrizAnexosExport($datos),
            'conciliacion-patrimonial' => new ConciliacionPatrimonialExport($datos),
            'observaciones' => new ObservacionesExport($datos),
        };
    }

    /**
     * Adapta los datos del reporte al modelo de vista genérico del PDF
     * (título, métricas, headings, filas de celdas planas).
     *
     * @param  array<string, mixed>  $datos
     * @return array<string, mixed>
     */
    private function modeloPdf(string $reporte, array $datos): array
    {
        $contexto = [
            'dependencia' => ['codigo' => '', 'nombre' => 'Consolidado institucional'],
            'emitido_en' => $datos['generado_en'] ?? Carbon::now()->format('d/m/Y H:i'),
            'es_borrador' => false,
        ];

        [$headings, $filas, $metricas] = match ($reporte) {
            'matriz-anexos' => [
                ['Código', 'Centro de costo', 'Nivel', 'Estado', 'A02', 'A03', 'A04', 'A05', 'A06', 'Obs.', 'Bienes', 'Verif.', '% Patr.'],
                array_map(fn (array $f): array => [
                    $f['codigo'], $f['nombre'], $f['nivel'], ucfirst((string) $f['estado_entrega']),
                    $f['anexo_02'] ? 'Sí' : '—', $f['anexo_03'] ? 'Sí' : '—', $f['anexo_04'] ? 'Sí' : '—',
                    $f['anexo_05'] ? 'Sí' : '—', $f['anexo_06'] ? 'Sí' : '—',
                    $f['observaciones_abiertas'], $f['patrimonio_total'], $f['patrimonio_confirmados'],
                    $f['patrimonio_porcentaje'].' %',
                ], $datos['filas']),
                [
                    'Dependencias' => $datos['metricas']['total_dependencias'] ?? 0,
                    'Consolidadas' => $datos['metricas']['consolidadas'] ?? 0,
                    '% Avance' => ($datos['metricas']['porcentaje_avance'] ?? 0).' %',
                ],
            ],
            'conciliacion-patrimonial' => [
                ['Código', 'Centro de costo', 'Total', 'Verificados', 'Pendientes', '% Avance'],
                array_map(fn (array $f): array => [
                    $f['codigo'], $f['nombre'], $f['total'], $f['confirmados'], $f['pendientes'], $f['porcentaje'].' %',
                ], $datos['filas']),
                [
                    'Bienes' => $datos['totales']['total_bienes'] ?? 0,
                    'Verificados' => $datos['totales']['verificados'] ?? 0,
                    '% Avance' => ($datos['totales']['porcentaje'] ?? 0).' %',
                ],
            ],
            'observaciones' => [
                ['Código', 'Centro de costo', 'Anexo', 'Observación', 'Estado', 'Registrada', 'Días'],
                array_map(fn (array $f): array => [
                    $f['codigo'], $f['nombre'], $f['anexo'], $f['descripcion'],
                    $f['estado_etiqueta'], $f['registrada_en'] ?? '', $f['dias_subsanacion'] ?? '',
                ], $datos['filas']),
                [
                    'Abiertas' => $datos['resumen']['abiertas'] ?? 0,
                    'Subsanadas' => $datos['resumen']['subsanadas'] ?? 0,
                ],
            ],
        };

        return [
            'contexto' => $contexto,
            'reporte' => [
                'titulo' => self::REPORTES[$reporte],
                'metricas' => $metricas,
                'headings' => $headings,
                'filas' => $filas,
            ],
        ];
    }
}
