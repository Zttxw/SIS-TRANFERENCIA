<?php

declare(strict_types=1);

namespace App\Support\Enums;

/**
 * Qué declara el Acta (Anexo 07) según el momento en que se emite (B3, D-06).
 *
 * El nuevo flujo exige firmar el acta ANTES de remitir, pero en ese momento la
 * recepción y la consolidación del padre todavía no han ocurrido: el acta solo
 * puede declarar la *suscripción de la dependencia (hija)*. El visto bueno y la
 * consolidación se registran aparte, sobre la versión efectivamente recibida.
 *
 * El acta no debe afirmar un hecho que aún no sucedió (doc 05 §4).
 */
enum DeclaracionActa: string
{
    /** Emitida antes de remitir: la dependencia suscribe y entrega sus anexos. */
    case SUSCRIPCION_HIJA = 'suscripcion_hija';

    /** Emitida tras consolidar: recepción y consolidación por el nivel superior. */
    case RECEPCION_CONSOLIDACION = 'recepcion_consolidacion';

    public function etiqueta(): string
    {
        return match ($this) {
            self::SUSCRIPCION_HIJA => 'Suscripción de la dependencia',
            self::RECEPCION_CONSOLIDACION => 'Recepción y consolidación',
        };
    }
}
