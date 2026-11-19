<?php

declare(strict_types=1);

namespace App\Support\Enums;

/**
 * Calidad en la que actúa el lado ETTE sobre un centro de costo (D-04): el
 * coordinador ETTE asignado o, si falta, un titular ETTE en suplencia (con
 * motivo registrado). En el Anexo 01, que se firma al cierre del proceso,
 * firma un titular ETTE en su propia calidad.
 */
enum CalidadEtte: string
{
    case COORDINADOR = 'coordinador';
    case TITULAR_SUPLENTE = 'titular_suplente';
    case TITULAR = 'titular';

    public function etiqueta(): string
    {
        return match ($this) {
            self::COORDINADOR => 'Coordinador ETTE',
            self::TITULAR_SUPLENTE => 'Titular ETTE (suplente del coordinador)',
            self::TITULAR => 'Titular ETTE',
        };
    }
}
