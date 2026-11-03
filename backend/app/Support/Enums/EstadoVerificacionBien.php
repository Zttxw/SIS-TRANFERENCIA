<?php

declare(strict_types=1);

namespace App\Support\Enums;

/**
 * Resultado de la verificación física de un bien por parte del servidor (plan §4.2, §7.4, RN-04).
 */
enum EstadoVerificacionBien: string
{
    case PENDIENTE = 'pendiente';
    case CONFIRMADO = 'confirmado';
    case NO_UBICADO = 'no_ubicado';
    case CON_OBSERVACION = 'con_observacion';

    public function etiqueta(): string
    {
        return match ($this) {
            self::PENDIENTE => 'Pendiente de verificación',
            self::CONFIRMADO => 'Confirmado por el servidor',
            self::NO_UBICADO => 'No ubicado por el servidor',
            self::CON_OBSERVACION => 'Con observación',
        };
    }

    /** ¿Requiere observación obligatoria? (RN-05) */
    public function requiereObservacion(): bool
    {
        return $this === self::NO_UBICADO || $this === self::CON_OBSERVACION;
    }
}
