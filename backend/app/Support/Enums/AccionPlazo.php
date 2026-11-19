<?php

declare(strict_types=1);

namespace App\Support\Enums;

/**
 * Acciones de la entrega que el cronograma puede bloquear al vencer un plazo
 * (D-12, fase 7): presentar al coordinador, aceptar la entrega, firmar y
 * remitir.
 */
enum AccionPlazo: string
{
    case PRESENTAR = 'presentar';
    case VERIFICAR = 'verificar';
    case FIRMAR = 'firmar';
    case REMITIR = 'remitir';

    public function etiqueta(): string
    {
        return match ($this) {
            self::PRESENTAR => 'Presentar al coordinador',
            self::VERIFICAR => 'Aceptar la entrega',
            self::FIRMAR => 'Firmar los anexos',
            self::REMITIR => 'Remitir la entrega',
        };
    }

    /** Siguiente acción que le toca a una entrega en ese estado; null si ya la remitió. */
    public static function siguientePara(EstadoEntrega $estado): ?self
    {
        return match ($estado) {
            EstadoEntrega::BORRADOR => self::PRESENTAR,
            EstadoEntrega::EN_REVISION => self::VERIFICAR,
            EstadoEntrega::VERIFICADA => self::FIRMAR,
            EstadoEntrega::ACTA_SUSCRITA => self::REMITIR,
            default => null,
        };
    }
}
