<?php

declare(strict_types=1);

namespace App\Support\Concerns;

use App\Modules\Transferencia\Models\Entrega;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Http\ApiResponse;
use Illuminate\Http\Exceptions\HttpResponseException;

/**
 * Integridad del flujo (RN-13, D-07): los anexos solo se editan mientras la
 * entrega no existe o está en BORRADOR. Desde que el responsable la cierra y la
 * pasa a firma (EN_REVISION, ACTA_SUSCRITA, REMITIDA…) quedan congelados: no hay
 * devolución ni subsanación.
 *
 * Es ortogonal a la autorización por ámbito (`AutorizaAmbito`): aquélla decide
 * *quién* y *sobre qué dependencia*; ésta decide *en qué estado del flujo* se
 * admite la escritura. Por eso vive en un trait aparte.
 *
 * Se invoca desde los services de anexo (único punto por el que pasan tanto las
 * escrituras por payload `dependencia_id` como las identificadas por id de
 * registro), garantizando cobertura uniforme.
 */
trait RespetaEstadoEntrega
{
    /**
     * Exige que la entrega de la dependencia dada admita edición. Lanza 409
     * (envuelto en ApiResponse) si ya se cerró para firma.
     */
    protected function exigirEntregaModificable(int $dependenciaId, ?int $procesoId = null): void
    {
        $procesoId = $procesoId ?? $this->resolverProcesoActivoIdParaEstado();

        $entrega = Entrega::where('proceso_transferencia_id', $procesoId)
            ->where('dependencia_id', $dependenciaId)
            ->latest('id')
            ->first();

        // Sin entrega aún, o en BORRADOR → editable.
        if ($entrega === null || $entrega->esModificable()) {
            return;
        }

        throw new HttpResponseException(
            ApiResponse::error(
                'Los anexos de este centro de costo ya se cerraron para la revisión y firma con el coordinador ETTE y no pueden editarse.',
                409,
            )
        );
    }

    private function resolverProcesoActivoIdParaEstado(): int
    {
        return (int) (ProcesoTransferencia::where('estado', 'abierto')->value('id') ?? 1);
    }
}
