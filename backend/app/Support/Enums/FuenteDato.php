<?php

declare(strict_types=1);

namespace App\Support\Enums;

/**
 * Origen de un registro. Permite diferenciar la información precargada desde
 * los sistemas institucionales de la registrada manualmente (RN-03, RN-07).
 */
enum FuenteDato: string
{
    case SGD = 'sgd';
    case SIGA = 'siga';
    case MANUAL = 'manual';

    public function etiqueta(): string
    {
        return match ($this) {
            self::SGD => 'Sistema de Gestión Documentaria',
            self::SIGA => 'SIGA — Módulo de Patrimonio',
            self::MANUAL => 'Registro manual',
        };
    }
}
