<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Services;

use App\Models\User;
use App\Modules\Acervo\Services\AcervoPdf;
use App\Modules\Gestion\Services\InformeGestionPdf;
use App\Modules\NoPatrimonial\Services\NoPatrimonialPdf;
use App\Modules\Organization\Services\CentrosCostoPdf;
use App\Modules\Patrimonio\Services\PatrimonioPdf;
use App\Modules\Personal\Services\PersonalPdf;
use App\Modules\Transferencia\Models\FirmaBorrador;
use App\Support\Services\ContextoTransferencia;
use App\Support\Services\PdfService;
use Illuminate\Support\Facades\Storage;
use InvalidArgumentException;

class FirmaperuPdfService
{
    public function __construct(
        private readonly PdfService $pdf,
        private readonly InformeGestionPdf $gestion,
        private readonly AcervoPdf $acervo,
        private readonly PatrimonioPdf $patrimonio,
        private readonly PersonalPdf $personal,
        private readonly NoPatrimonialPdf $noPatrimonial,
        private readonly ActaPdf $acta,
        private readonly CentrosCostoPdf $centros,
    ) {}

    /**
     * Reutiliza vistas y consultas actuales, incluyendo proceso y marca de borrador.
     * La autorización de dependencia corresponde al endpoint que invoque el servicio.
     */
    public function generar(string $tipoDocumento, int $dependenciaId, User $usuario): string
    {
        [$vista, $datos, $orientacion] = $this->plantilla($tipoDocumento, $dependenciaId, $usuario);

        return $this->pdf->binario($vista, $datos, 'a4', $orientacion);
    }

    /**
     * Genera y SOBRESCRIBE el borrador oficial de un documento (02-07) sin firmarlo.
     * Un único archivo por (proceso, dependencia, tipo); no crea DocumentoFirma ni
     * versiona. Es el insumo que luego se firma en «Mi entrega».
     */
    public function generarBorrador(string $tipoDocumento, int $dependenciaId, User $usuario): FirmaBorrador
    {
        $tipo = $tipoDocumento === 'acta' ? 'anexo07' : $tipoDocumento;
        $procesoId = app(ContextoTransferencia::class)->procesoActivoId();
        $contenido = $this->generar($tipo, $dependenciaId, $usuario);
        $ruta = 'firmaperu/borradores/'.$procesoId.'/'.$dependenciaId.'/'.$tipo.'.pdf';
        abort_unless(Storage::disk('local')->put($ruta, $contenido), 503, 'No se pudo conservar el PDF borrador.');

        return FirmaBorrador::updateOrCreate(
            ['proceso_transferencia_id' => $procesoId, 'dependencia_id' => $dependenciaId, 'tipo_documento' => $tipo],
            ['pdf_path' => $ruta, 'pdf_sha256' => hash('sha256', $contenido),
                'generado_por' => $usuario->id, 'generado_en' => now()],
        );
    }

    /** Huella del contenido impreso, sin hora de impresión ni estado operativo de entrega. */
    public function huella(string $tipoDocumento, int $dependenciaId, User $usuario): string
    {
        [$vista, $datos] = $this->plantilla($tipoDocumento, $dependenciaId, $usuario);

        return $this->huellaPlantilla($tipoDocumento, $vista, $datos, $dependenciaId, $usuario);
    }

    /** @return array{pdf: string, huella: string} */
    public function capturar(string $tipoDocumento, int $dependenciaId, User $usuario): array
    {
        [$vista, $datos, $orientacion] = $this->plantilla($tipoDocumento, $dependenciaId, $usuario);

        return ['pdf' => $this->pdf->binario($vista, $datos, 'a4', $orientacion),
            'huella' => $this->huellaPlantilla($tipoDocumento, $vista, $datos, $dependenciaId, $usuario)];
    }

    /** @param array<string, mixed> $datos */
    private function huellaPlantilla(string $tipoDocumento, string $vista, array $datos, int $dependenciaId, User $usuario): string
    {
        $datos['contexto']['emitido_en'] = '';
        $datos['contexto']['entrega_estado'] = 'borrador';
        $datos['contexto']['entrega_estado_etiqueta'] = '';
        $datos['contexto']['es_borrador'] = true;

        $contenido = view($vista, $datos)->render();
        if ($tipoDocumento === 'anexo07') {
            foreach (['anexo02', 'anexo03', 'anexo04', 'anexo05', 'anexo06'] as $anexo) {
                $contenido .= $this->huella($anexo, $dependenciaId, $usuario);
            }
        }

        return hash('sha256', $contenido);
    }

    /** @return array{string, array<string, mixed>, string} */
    private function plantilla(string $tipoDocumento, int $dependenciaId, User $usuario): array
    {
        [$vista, $datos, $orientacion] = match ($tipoDocumento) {
            'anexo01' => ['pdf.anexo01', $this->centros->datos($dependenciaId), 'portrait'],
            'anexo02' => ['pdf.anexo02', $this->gestion->datos($dependenciaId), 'portrait'],
            'anexo03' => ['pdf.anexo03', $this->acervo->datos($dependenciaId), 'portrait'],
            'anexo04' => ['pdf.anexo04', $this->patrimonio->datos($dependenciaId), 'landscape'],
            'anexo05' => ['pdf.anexo05', $this->personal->datos($dependenciaId), 'landscape'],
            'anexo06' => ['pdf.anexo06', $this->noPatrimonial->datos($dependenciaId), 'portrait'],
            'anexo07', 'acta' => ['pdf.acta', $this->acta->datos($dependenciaId, $usuario), 'portrait'],
            default => throw new InvalidArgumentException('Tipo de documento no soportado para firma.'),
        };

        return [$vista, $datos, $orientacion];
    }
}
