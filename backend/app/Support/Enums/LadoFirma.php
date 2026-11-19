<?php

declare(strict_types=1);

namespace App\Support\Enums;

/**
 * Lado que suscribe un documento 02–07 (directiva 2026, D-05).
 *
 * Cada documento necesita una firma vigente de cada lado, en la misma cadena
 * de PDF firmados:
 * - ENTIDAD: el responsable del centro de costo, siempre digital (Firma Perú).
 * - ETTE: el coordinador ETTE asignado al CC o, en su ausencia, un titular
 *   ETTE en suplencia (con motivo). Digital o manuscrita (D-06).
 */
enum LadoFirma: string
{
    case ENTIDAD = 'entidad';
    case ETTE = 'ette';

    public function etiqueta(): string
    {
        return match ($this) {
            self::ENTIDAD => 'Responsable del centro de costo',
            self::ETTE => 'Coordinador ETTE',
        };
    }
}
