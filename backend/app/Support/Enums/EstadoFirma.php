<?php

declare(strict_types=1);

namespace App\Support\Enums;

/**
 * Ciclo de vida de una firma sobre un anexo (RF-005).
 *
 * - PENDIENTE: firma esperada aún no realizada.
 * - FIRMADA: suscripción válida registrada a nombre del firmante efectivo.
 * - CANCELADA: intento cancelado o fallido; NO cuenta como firmada (RF-005).
 * - AUSENTE: firma opcional ETTE que no se realizó; se deja constancia y se
 *   entrega copia digital (C-08). No es una conformidad ni una firma válida.
 *
 * El proveedor real (Firma Perú/RENIEC) y el orden de firmas siguen pendientes
 * (D-02); este enum solo modela los estados ya confirmados por los requisitos.
 */
enum EstadoFirma: string
{
    case PENDIENTE = 'pendiente';
    case FIRMADA = 'firmada';
    case CANCELADA = 'cancelada';
    case AUSENTE = 'ausente';

    public function etiqueta(): string
    {
        return match ($this) {
            self::PENDIENTE => 'Pendiente de firma',
            self::FIRMADA => 'Firmada',
            self::CANCELADA => 'Cancelada o fallida',
            self::AUSENTE => 'Ausente (constancia y copia digital)',
        };
    }

    /** ¿Representa una suscripción válida? Solo FIRMADA (RF-005). */
    public function esValida(): bool
    {
        return $this === self::FIRMADA;
    }
}
