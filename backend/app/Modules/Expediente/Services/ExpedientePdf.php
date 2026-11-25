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
use App\Support\Enums\TipoAcervo;
use App\Support\Http\ApiResponse;
use App\Support\Services\ContextoTransferencia;
use App\Support\Services\PdfService;
use Illuminate\Http\Exceptions\HttpResponseException;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Paquete de entrega (F5): un único expediente PDF con todos los anexos (02–06,
 * con el acervo en 03-A físico y 03-B digital)
 * de una dependencia, listo para la entrega física firmable. Solo se emite con
 * la entrega remitida (409 en otro caso), como el acta. Reutiliza los
 * generadores de cada anexo (su método `datos()`) para no duplicar la lógica de
 * armado, y la presencia real de anexos (`presenciaAnexos`) para incluir solo lo
 * que existe.
 */
class ExpedientePdf
{
    /** Índice oficial del expediente. */
    private const INDICE = [
        'anexo_02' => ['anexo' => 'Anexo 02', 'nombre' => 'Informe de Gestión'],
        'anexo_03a' => ['anexo' => 'Anexo 03-A', 'nombre' => 'Registro del Acervo Documentario Físico'],
        'anexo_03b' => ['anexo' => 'Anexo 03-B', 'nombre' => 'Registro del Acervo Documentario Digital (SGD)'],
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
        $this->exigirRemitida($dependenciaId);
        $datos = $this->datos($dependenciaId);

        return $this->pdf->descargar('pdf.paquete', $datos, $this->nombreArchivo($datos), 'a4', 'landscape');
    }

    /**
     * Copia de consulta del expediente (sin firmas), para incluirla en el
     * expediente firmado.
     *
     * @return array{nombre: string, contenido: string}
     */
    public function binario(int $dependenciaId): array
    {
        $this->exigirRemitida($dependenciaId);
        $datos = $this->datos($dependenciaId);

        return ['nombre' => $this->nombreArchivo($datos),
            'contenido' => $this->pdf->binario('pdf.paquete', $datos, 'a4', 'landscape')];
    }

    /** @return array<string, mixed> */
    private function datos(int $dependenciaId): array
    {
        $contexto = $this->contexto->paraDependencia($dependenciaId);
        $presencia = $this->transferencia->presenciaAnexos($dependenciaId, $contexto['proceso_id']);

        $datos = ['contexto' => $contexto, 'indice' => $this->indice($presencia)];

        // Solo se arma el modelo de vista de los anexos realmente presentes.
        if ($presencia['anexo_02'] ?? false) {
            $datos['anexo02'] = $this->gestion->datos($dependenciaId);
        }
        foreach (TipoAcervo::cases() as $tipo) {
            if ($presencia[$tipo->itemActa()] ?? false) {
                $datos['acervo'][] = $this->acervo->datos($dependenciaId, $tipo);
            }
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

        return $datos;
    }

    /** @param array<string, mixed> $datos */
    private function nombreArchivo(array $datos): string
    {
        $codigo = str_replace('.', '', (string) ($datos['contexto']['dependencia']['codigo'] ?? 's-c'));

        return "Expediente-Transferencia-{$codigo}.pdf";
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

    public function exigirRemitida(int $dependenciaId): void
    {
        $procesoId = $this->contexto->procesoActivoId();
        $entrega = Entrega::where('proceso_transferencia_id', $procesoId)
            ->where('dependencia_id', $dependenciaId)
            ->latest('id')
            ->first();

        if ($entrega === null || ! $entrega->estado->fueRemitida()) {
            throw new HttpResponseException(
                ApiResponse::error(
                    'El expediente completo solo puede descargarse cuando la entrega fue remitida.',
                    409,
                )
            );
        }
    }
}
