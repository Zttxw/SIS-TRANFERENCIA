<?php

declare(strict_types=1);

namespace Tests\Concerns;

use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\Entrega;
use App\Support\Enums\EstadoEntrega;

/**
 * Deja la entrega de un CC en el estado indicado, sin recorrer el cierre para
 * firma (se prueba aparte en RevisionCoordinadorTest). Por defecto, cerrada
 * para revisión y firma.
 */
trait PreparaEntregas
{
    protected function entregaEn(Dependencia $dependencia, EstadoEntrega $estado = EstadoEntrega::EN_REVISION): Entrega
    {
        return Entrega::updateOrCreate(
            ['proceso_transferencia_id' => $dependencia->proceso_transferencia_id, 'dependencia_id' => $dependencia->id],
            ['dependencia_destino_id' => $dependencia->parent_id, 'estado' => $estado],
        );
    }
}
