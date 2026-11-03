<?php

declare(strict_types=1);

namespace App\Support\Enums;

/**
 * Ciclo de vida de una observación y su subsanación (plan §7.9).
 */
enum EstadoObservacion: string
{
    case ABIERTA = 'abierta';
    case EN_SUBSANACION = 'en_subsanacion';
    case SUBSANADA = 'subsanada';
    case DESESTIMADA = 'desestimada';

    public function etiqueta(): string
    {
        return match ($this) {
            self::ABIERTA => 'Abierta',
            self::EN_SUBSANACION => 'En subsanación',
            self::SUBSANADA => 'Subsanada',
            self::DESESTIMADA => 'Desestimada',
        };
    }
}
