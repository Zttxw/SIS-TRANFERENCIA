<?php

declare(strict_types=1);

namespace App\Support\Enums;

/**
 * Estado de conservación de un bien (patrimonial o no patrimonial).
 */
enum EstadoConservacion: string
{
    case BUENO = 'bueno';
    case REGULAR = 'regular';
    case MALO = 'malo';
    case INSERVIBLE = 'inservible';

    public function etiqueta(): string
    {
        return match ($this) {
            self::BUENO => 'Bueno',
            self::REGULAR => 'Regular',
            self::MALO => 'Malo',
            self::INSERVIBLE => 'Inservible / de baja',
        };
    }
}
