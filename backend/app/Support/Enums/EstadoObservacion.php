<?php

declare(strict_types=1);

namespace App\Support\Enums;

/**
 * Estado de una observación del coordinador ETTE (D-07). La observación es una
 * constancia: no se subsana ni devuelve la entrega. El coordinador puede
 * retirarla mientras no acepte la entrega.
 */
enum EstadoObservacion: string
{
    case REGISTRADA = 'registrada';
    case RETIRADA = 'retirada';

    public function etiqueta(): string
    {
        return match ($this) {
            self::REGISTRADA => 'Registrada',
            self::RETIRADA => 'Retirada',
        };
    }
}
