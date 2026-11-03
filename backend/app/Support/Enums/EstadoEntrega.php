<?php

declare(strict_types=1);

namespace App\Support\Enums;

/**
 * Estado de una entrega en el flujo jerárquico de consolidación (plan §6, §7.8).
 */
enum EstadoEntrega: string
{
    case BORRADOR = 'borrador';
    case REMITIDA = 'remitida';
    case EN_REVISION = 'en_revision';
    case OBSERVADA = 'observada';
    case CONSOLIDADA = 'consolidada';
    case CERRADA = 'cerrada';

    public function etiqueta(): string
    {
        return match ($this) {
            self::BORRADOR => 'Borrador',
            self::REMITIDA => 'Remitida',
            self::EN_REVISION => 'En revisión',
            self::OBSERVADA => 'Observada',
            self::CONSOLIDADA => 'Consolidada',
            self::CERRADA => 'Cerrada',
        };
    }
}
