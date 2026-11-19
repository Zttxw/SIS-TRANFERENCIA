<?php

declare(strict_types=1);

namespace App\Modules\Expediente\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Expediente\Services\ExpedienteFirmado;
use App\Modules\Expediente\Services\ExpedientePdf;
use App\Support\Concerns\AutorizaAmbito;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExpedienteController extends Controller
{
    use AutorizaAmbito;

    public function __construct(
        private readonly ExpedientePdf $expedientePdf,
    ) {}

    /**
     * Descarga el expediente completo (todos los anexos de la dependencia en un
     * solo PDF). Exige entrega remitida (409 en otro caso) y ámbito.
     */
    public function pdf(Request $request): StreamedResponse
    {
        $dependenciaId = (int) $request->input('dependencia_id');
        abort_unless($dependenciaId > 0, 422, 'Debe especificar dependencia_id.');
        $this->autorizarDependencia($request->user(), $dependenciaId);

        return $this->expedientePdf->descargar($dependenciaId);
    }

    /**
     * Descarga el expediente firmado (ZIP): los PDF finales de los anexos 02 al
     * 07 con ambas firmas, del CC y de los CC de su subárbol que ya remitieron.
     */
    public function firmado(Request $request, ExpedienteFirmado $expediente): BinaryFileResponse
    {
        $dependenciaId = (int) $request->input('dependencia_id');
        abort_unless($dependenciaId > 0, 422, 'Debe especificar dependencia_id.');
        $this->autorizarDependencia($request->user(), $dependenciaId);

        return $expediente->descargar($dependenciaId, $request->user());
    }
}
