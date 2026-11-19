<?php

declare(strict_types=1);

namespace App\Modules\Gestion\Services;

use App\Modules\Gestion\Models\InformeGestion;
use App\Modules\Organization\Models\Dependencia;
use Illuminate\Support\Carbon;

/**
 * Congela los documentos pendientes de la sección IV del Anexo 02 cuando el
 * responsable presenta la entrega al coordinador (D-09). Desde entonces el PDF
 * del Anexo 02 (y su huella de firma) no cambia aunque cambie el SGD.
 */
class CongelamientoAgendaPendiente
{
    public function __construct(
        private readonly PendientesDocumentales $pendientes,
    ) {}

    /** Guarda la copia fija en el informe del CC; lo crea si aún no existe. */
    public function congelar(Dependencia $dependencia): InformeGestion
    {
        $informe = InformeGestion::firstOrNew([
            'proceso_transferencia_id' => $dependencia->proceso_transferencia_id,
            'dependencia_id' => $dependencia->id,
        ]);

        $informe->fill([
            'pendientes_documentales' => $this->pendientes->filas($dependencia->id, $dependencia->proceso_transferencia_id),
            'pendientes_congelados_en' => Carbon::now(),
        ])->save();

        return $informe;
    }
}
