<?php

declare(strict_types=1);

namespace App\Support\Enums;

/**
 * Ciclo de vida de una firma sobre un anexo (RF-005).
 *
 * - PENDIENTE: firma esperada aún no realizada.
 * - FIRMADA: suscripción válida registrada a nombre del firmante efectivo.
 * - CANCELADA: firma que dejó de valer (datos cambiados, nueva versión del acta)
 *   o intento fallido; NO cuenta como firmada (RF-005).
 */
enum EstadoFirma: string
{
    case PENDIENTE = 'pendiente';
    case FIRMADA = 'firmada';
    case CANCELADA = 'cancelada';

    public function etiqueta(): string
    {
        return match ($this) {
            self::PENDIENTE => 'Pendiente de firma',
            self::FIRMADA => 'Firmada',
            self::CANCELADA => 'Cancelada o fallida',
        };
    }

    /** ¿Representa una suscripción válida? Solo FIRMADA (RF-005). */
    public function esValida(): bool
    {
        return $this === self::FIRMADA;
    }
}
