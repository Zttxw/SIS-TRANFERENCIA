<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Services;

use App\Modules\Organization\Models\Dependencia;

/**
 * Firmantes que figuran en el bloque de suscripción de los anexos 02 al 06 del
 * PDF individual. Son los mismos dos lados que firman cada anexo con Firma
 * Perú y que figuran en el Acta 07: el responsable del centro de costo, que
 * entrega, y el firmante ETTE vigente (coordinador o titular que lo suple),
 * que recibe y verifica.
 */
class FirmasAnexo
{
    public function __construct(private readonly IntervinientesActa $intervinientes) {}

    /**
     * @return array{
     *     entrega: array{nombre: string, dni: string, cargo: string},
     *     recepcion: array{nombre: string, dni: string, cargo: string, calidad: string},
     *     centro: string,
     * }
     */
    public function paraDependencia(int $dependenciaId): array
    {
        $dependencia = Dependencia::findOrFail($dependenciaId);

        return [
            'entrega' => $this->intervinientes->entrega($dependencia),
            'recepcion' => $this->intervinientes->recepcion($dependencia),
            'centro' => trim("{$dependencia->codigo} — {$dependencia->nombre}", ' —'),
        ];
    }
}
