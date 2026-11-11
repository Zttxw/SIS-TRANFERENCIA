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
use App\Support\Services\PdfService;
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

        return $this->pdf->binario($vista, $datos, 'a4', $orientacion);
    }
}
