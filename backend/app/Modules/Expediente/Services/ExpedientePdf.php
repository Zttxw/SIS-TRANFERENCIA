<?php

declare(strict_types=1);

namespace App\Modules\Expediente\Services;

use App\Modules\Acervo\Services\AcervoPdf;
use App\Modules\Gestion\Services\InformeGestionPdf;
use App\Modules\NoPatrimonial\Services\NoPatrimonialPdf;
use App\Modules\Patrimonio\Services\PatrimonioPdf;
use App\Modules\Personal\Services\PersonalPdf;
use App\Modules\Transferencia\Models\Entrega;
use App\Modules\Transferencia\Services\TransferenciaService;
use App\Support\Enums\EstadoEntrega;
use App\Support\Http\ApiResponse;
use App\Support\Services\ContextoTransferencia;
use App\Support\Services\PdfService;
use Illuminate\Http\Exceptions\HttpResponseException;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Paquete de entrega (F5): un único expediente PDF con todos los anexos (02–06)
 * de una dependencia, listo para la entrega física firmable. Solo se emite con
 * la entrega CONSOLIDADA (409 en otro caso), como el acta. Reutiliza los
 * generadores de cada anexo (su método `datos()`) para no duplicar la lógica de
 * armado, y la presencia real de anexos (`presenciaAnexos`) para incluir solo lo
 * que existe.
 */
class ExpedientePdf
{
    /** Índice oficial del expediente. */
    private const INDICE = [
        'anexo_02' => ['anexo' => 'Anexo 02', 'nombre' => 'Informe de Gestión'],
        'anexo_03' => ['anexo' => 'Anexo 03', 'nombre' => 'Registro del Acervo Documentario'],
        'anexo_04' => ['anexo' => 'Anexo 04', 'nombre' => 'Registro de Bienes Patrimoniales'],
        'anexo_05' => ['anexo' => 'Anexo 05', 'nombre' => 'Información del Personal a cargo'],
        'anexo_06' => ['anexo' => 'Anexo 06', 'nombre' => 'Bienes No Patrimoniales'],
    ];

    public function __construct(
        private readonly ContextoTransferencia $contexto,
        private readonly TransferenciaService $transferencia,
        private readonly InformeGestionPdf $gestion,
        private readonly AcervoPdf $acervo,
        private readonly PatrimonioPdf $patrimonio,
        private readonly PersonalPdf $personal,
        private readonly NoPatrimonialPdf $noPatrimonial,
        private readonly PdfService $pdf,
    ) {}

    public function descargar(int $dependenciaId): StreamedResponse
    {
        $this->exigirConsolidada($dependenciaId);

        $contexto = $this->contexto->paraDependencia($dependenciaId);
        $presencia = $this->transferencia->presenciaAnexos($dependenciaId, $contexto['proceso_id']);

        $datos = ['contexto' => $contexto, 'indice' => $this->indice($presencia)];

        // Solo se arma el modelo de vista de los anexos realmente presentes.
        if ($presencia['anexo_02'] ?? false) {
            $datos['anexo02'] = $this->gestion->datos($dependenciaId);
        }
        if ($presencia['anexo_03'] ?? false) {
            $datos['anexo03'] = $this->acervo->datos($dependenciaId);
        }
        if ($presencia['anexo_04'] ?? false) {
            $datos['anexo04'] = $this->patrimonio->datos($dependenciaId);
        }
        if ($presencia['anexo_05'] ?? false) {
            $datos['anexo05'] = $this->personal->datos($dependenciaId);
        }
        if ($presencia['anexo_06'] ?? false) {
            $datos['anexo06'] = $this->noPatrimonial->datos($dependenciaId);
        }

        $codigo = str_replace('.', '', (string) ($contexto['dependencia']['codigo'] ?? 's-c'));

        return $this->pdf->descargar(
            'pdf.paquete',
            $datos,
            "Expediente-Transferencia-{$codigo}.pdf",
            'a4',
            'landscape',
        );
    }

    /** @param array<string, bool> $presencia @return list<array<string, mixed>> */
    private function indice(array $presencia): array
    {
        $filas = [];
        foreach (self::INDICE as $clave => $meta) {
            $filas[] = [...$meta, 'incluido' => (bool) ($presencia[$clave] ?? false)];
        }

        return $filas;
    }

    private function exigirConsolidada(int $dependenciaId): void
    {
        $procesoId = $this->contexto->procesoActivoId();
        $entrega = Entrega::where('proceso_transferencia_id', $procesoId)
            ->where('dependencia_id', $dependenciaId)
            ->latest('id')
            ->first();

        if ($entrega === null || $entrega->estado !== EstadoEntrega::CONSOLIDADA) {
            throw new HttpResponseException(
                ApiResponse::error(
                    'El expediente completo solo puede descargarse cuando la entrega está consolidada.',
                    409,
                )
            );
        }
    }
}
