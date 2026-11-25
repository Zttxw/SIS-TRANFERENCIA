<?php

declare(strict_types=1);

namespace App\Support\Services;

use Barryvdh\DomPDF\Facade\Pdf;
use Dompdf\Dompdf;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Generador central de PDF de los anexos oficiales (F5). Envuelve dompdf para
 * que cada módulo solo aporte su vista Blade y su modelo de vista; el formato,
 * la cabecera/pie institucional y la marca de agua de borrador viven en
 * `resources/views/pdf/layout.blade.php`.
 */
class PdfService
{
    /**
     * Renderiza una vista Blade a PDF y la entrega como descarga en streaming.
     *
     * @param  array<string, mixed>  $datos  Modelo de vista; debe incluir `contexto`.
     */
    public function descargar(string $vista, array $datos, string $nombreArchivo, string $tamano = 'a4', string $orientacion = 'portrait'): StreamedResponse
    {
        $contenido = $this->binario($vista, $datos, $tamano, $orientacion);

        return response()->streamDownload(
            function () use ($contenido): void {
                echo $contenido;
            },
            $nombreArchivo,
            [
                'Content-Type' => 'application/pdf',
                'Cache-Control' => 'no-store, no-cache, must-revalidate',
            ],
        );
    }

    /**
     * Renderiza una vista Blade a PDF y devuelve el binario (para empaquetar
     * varios anexos en un expediente único; F5 paquete de entrega).
     *
     * @param  array<string, mixed>  $datos
     */
    public function binario(string $vista, array $datos, string $tamano = 'a4', string $orientacion = 'portrait'): string
    {
        $pdf = Pdf::loadView($vista, $datos)
            ->setPaper($tamano, $orientacion)
            ->setOption('isRemoteEnabled', false)
            ->setOption('isHtml5ParserEnabled', true)
            ->setOption('defaultFont', 'DejaVu Sans');
        $pdf->render();
        $this->numerarPaginas($pdf->getDomPDF());

        return $pdf->output();
    }

    /**
     * Dibuja «Pág. X / Y» en el hueco derecho del pie del layout (el contador
     * CSS `counter(pages)` no funciona en dompdf). Las medidas, en puntos,
     * replican las del pie: margen lateral de 36px, texto a 7px y gris #737373.
     */
    private function numerarPaginas(Dompdf $dompdf): void
    {
        $canvas = $dompdf->getCanvas();
        $metricas = $dompdf->getFontMetrics();
        $fuente = $metricas->getFont('DejaVu Sans', 'normal');
        $tamano = 5.25;
        $margenLateral = 27;
        $anchoTexto = $metricas->getTextWidth('Pág. 00 / 00', $fuente, $tamano);

        $canvas->page_text($canvas->get_width() - $margenLateral - $anchoTexto, $canvas->get_height() - 29,
            'Pág. {PAGE_NUM} / {PAGE_COUNT}', $fuente, $tamano, [0.45, 0.45, 0.45]);
    }
}
