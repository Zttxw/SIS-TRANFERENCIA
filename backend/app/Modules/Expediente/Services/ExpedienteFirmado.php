<?php

declare(strict_types=1);

namespace App\Modules\Expediente\Services;

use App\Models\User;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Services\CadenaFirmas;
use App\Modules\Transferencia\Services\ConsolidacionCentroCosto;
use App\Modules\Transferencia\Services\SuscripcionEntrega;
use App\Support\Enums\EstadoEntrega;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use ZipArchive;

/**
 * Expediente firmado de una entrega remitida (fase 6): un ZIP con los PDF
 * finales de los anexos 02 al 07 —con las firmas del responsable y del
 * coordinador ETTE intactas— del CC y de cada CC de su subárbol que ya remitió,
 * más la copia de consulta del expediente del CC.
 *
 * Los PDF firmados se entregan tal cual (no se fusionan) para no invalidar las
 * firmas digitales.
 */
class ExpedienteFirmado
{
    private const NOMBRES = [
        'anexo02' => 'Anexo-02-Informe-de-gestion',
        'anexo03' => 'Anexo-03-Acervo-documentario',
        'anexo04' => 'Anexo-04-Bienes-patrimoniales',
        'anexo05' => 'Anexo-05-Personal',
        'anexo06' => 'Anexo-06-Bienes-no-patrimoniales',
        'anexo07' => 'Anexo-07-Acta-de-transferencia',
    ];

    public function __construct(
        private readonly ExpedientePdf $consulta,
        private readonly CadenaFirmas $cadena,
        private readonly ConsolidacionCentroCosto $consolidacion,
    ) {}

    public function descargar(int $dependenciaId, User $usuario): BinaryFileResponse
    {
        $this->consulta->exigirRemitida($dependenciaId);
        $centro = Dependencia::findOrFail($dependenciaId);
        $ruta = tempnam(sys_get_temp_dir(), 'expediente-');
        $zip = new ZipArchive;
        if ($ruta === false || $zip->open($ruta, ZipArchive::OVERWRITE) !== true) {
            throw new RuntimeException('No se pudo preparar el expediente firmado.');
        }

        $copia = $this->consulta->binario($centro->id);
        $zip->addFromString('Consulta-'.$copia['nombre'], $copia['contenido']);
        foreach ($this->centrosRemitidos($centro) as $cc) {
            $carpeta = $this->carpeta($cc);
            foreach (SuscripcionEntrega::DOCUMENTOS as $tipo) {
                $estado = $this->cadena->estado($cc->proceso_transferencia_id, $cc->id, $tipo, $usuario);
                if ($estado['completo'] && $estado['firmado_path'] && Storage::disk('local')->exists($estado['firmado_path'])) {
                    $zip->addFromString($carpeta.'/'.self::NOMBRES[$tipo].'-firmado.pdf', Storage::disk('local')->get($estado['firmado_path']));
                }
            }
        }
        $zip->close();

        return response()->download($ruta, 'Expediente-firmado-'.str_replace('.', '', (string) $centro->codigo).'.zip',
            ['Content-Type' => 'application/zip', 'Cache-Control' => 'no-store'])->deleteFileAfterSend();
    }

    /**
     * El CC y los CC de su subárbol cuya entrega ya fue remitida.
     *
     * @return list<Dependencia>
     */
    private function centrosRemitidos(Dependencia $centro): array
    {
        $ids = $centro->idsSubarbol();
        $entregas = $this->consolidacion->entregasPorCentro($centro->proceso_transferencia_id, $ids);

        return Dependencia::query()->centrosCosto()->whereIn('id', $ids)->get()
            ->filter(fn (Dependencia $cc): bool => ($entregas->get($cc->id)?->estado ?? EstadoEntrega::BORRADOR)->fueRemitida())
            ->sortBy('codigo', SORT_NATURAL)->values()->all();
    }

    private function carpeta(Dependencia $cc): string
    {
        return $cc->codigo.' '.Str::limit(Str::slug((string) $cc->nombre, ' '), 60, '');
    }
}
