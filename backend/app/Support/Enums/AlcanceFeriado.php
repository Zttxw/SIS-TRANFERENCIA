<?php

declare(strict_types=1);

namespace App\Support\Enums;

/**
 * Alcance de un día no laborable (RF-22): nacional (ley o decreto) o local
 * (Cusco o la Municipalidad). Ambos cuentan igual para los días hábiles.
 */
enum AlcanceFeriado: string
{
    case NACIONAL = 'nacional';
    case LOCAL = 'local';

    public function etiqueta(): string
    {
        return match ($this) {
            self::NACIONAL => 'Nacional',
            self::LOCAL => 'Local',
        };
    }
}
