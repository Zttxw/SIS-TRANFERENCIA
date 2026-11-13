<?php

declare(strict_types=1);

namespace App\Modules\Gestion\Services;

use App\Modules\Gestion\Models\InformeGestion;
use App\Support\Services\ContextoTransferencia;
use App\Support\Services\PdfService;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Generador del PDF oficial del Anexo 02 (Informe de Gestión), con el formato
 * exacto de la directiva (secciones I–V). Es la vertical de referencia de F5:
 * resuelve el modelo de vista a partir del informe guardado y delega el render
 * en el PdfService compartido.
 */
class InformeGestionPdf
{
    /** Mapeo nivel organizacional (modelo) → clave de checkbox de la plantilla. */
    private const NIVELES = ['primer_nivel', 'segundo_nivel', 'tercer_nivel', 'equipo_trabajo'];

    public function __construct(
        private readonly GestionService $gestionService,
        private readonly ContextoTransferencia $contexto,
        private readonly PdfService $pdf,
    ) {}

    public function descargar(int $dependenciaId): StreamedResponse
    {
        $datos = $this->datos($dependenciaId);
        $nombre = $this->nombreArchivo($datos['contexto']);

        return $this->pdf->descargar('pdf.anexo02', $datos, $nombre);
    }

    /**
     * Modelo de vista completo del Anexo 02 (contexto + informe + closure de
     * nivel). Lo consume tanto el PDF individual como el expediente (F5 paquete).
     *
     * @return array<string, mixed>
     */
    public function datos(int $dependenciaId): array
    {
        $contexto = $this->contexto->paraDependencia($dependenciaId);
        $informe = $this->gestionService->obtenerInforme($dependenciaId);

        return [
            'contexto' => $contexto,
            'informe' => $this->modeloDeVista($informe),
            'nivelCheck' => fn (string $nivel): string => $this->nivelCheck($informe, $nivel),
        ];
    }

    /**
     * Modelo de vista plano para la plantilla Blade. Un informe inexistente aún
     * produce un PDF en blanco con el formato oficial (útil como borrador físico).
     *
     * @return array<string, mixed>
     */
    private function modeloDeVista(?InformeGestion $informe): array
    {
        $responsable = $informe?->responsable;

        return [
            'organo' => $informe?->dependencia?->nombre ?? '',
            'denominacion' => $informe?->dependencia?->nombre ?? '',
            'nivel_organizacional' => $informe?->nivel_organizacional ?? '',
            'responsable' => $informe?->responsable_nombre ?? ($responsable ? trim("{$responsable->nombres} {$responsable->apellidos}") : ''),
            'responsable_dni' => $responsable?->dni ?? '',
            'cargo_periodo' => $informe?->cargo_periodo ?? '',
            'funciones' => $informe?->funciones ?? [],
            'logros_items' => $informe?->logros_items ?? [],
            'dificultades_items' => $informe?->dificultades_items ?? [],
            'pendientes_items' => $informe?->pendientes_items ?? [],
        ];
    }

    /** Devuelve ☒ si el nivel coincide con el del informe, ☐ en caso contrario. */
    private function nivelCheck(?InformeGestion $informe, string $nivel): string
    {
        if (! in_array($nivel, self::NIVELES, true)) {
            return '&#9744;';
        }

        return ($informe?->nivel_organizacional === $nivel) ? '&#9746;' : '&#9744;';
    }

    /** @param array<string, mixed> $contexto */
    private function nombreArchivo(array $contexto): string
    {
        $codigo = str_replace('.', '', (string) ($contexto['dependencia']['codigo'] ?? 's-c'));
        $sufijo = ($contexto['es_borrador'] ?? false) ? '-BORRADOR' : '';

        return "Anexo02-InformeGestion-{$codigo}{$sufijo}.pdf";
    }
}
