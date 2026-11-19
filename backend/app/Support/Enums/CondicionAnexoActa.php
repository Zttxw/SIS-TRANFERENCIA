<?php

declare(strict_types=1);

namespace App\Support\Enums;

/**
 * Condición de cada ítem de la sección III del Acta 07 (RF-62, RN-11). "No
 * aplica" solo se admite para el Anexo 06 y para "otros documentos".
 */
enum CondicionAnexoActa: string
{
    case ENTREGADO = 'entregado';
    case NO_ENTREGADO = 'no_entregado';
    case NO_APLICA = 'no_aplica';

    public function etiqueta(): string
    {
        return match ($this) {
            self::ENTREGADO => 'Entregado',
            self::NO_ENTREGADO => 'No entregado',
            self::NO_APLICA => 'No aplica',
        };
    }

    public function admitidaPara(string $item): bool
    {
        return $this !== self::NO_APLICA || in_array($item, ['anexo_06', 'otros'], true);
    }
}
