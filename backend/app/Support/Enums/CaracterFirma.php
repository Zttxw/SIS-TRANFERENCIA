<?php

declare(strict_types=1);

namespace App\Support\Enums;

/**
 * Carácter de una firma sobre un anexo (RF-004/005, C-02/C-08 confirmados).
 *
 * - OBLIGATORIA: firma que el personal de la entidad o ETTS debe suscribir
 *   según su responsabilidad. Su ausencia bloquea la entrega.
 * - OPCIONAL: firma del delegado ETTE. Su ausencia NO bloquea la entrega; se
 *   registra la constancia y se entrega copia digital (C-08).
 *
 * El carácter concreto de cada firmante por documento (la "matriz documental")
 * sigue pendiente (D-02); este enum solo tipa la distinción ya confirmada.
 */
enum CaracterFirma: string
{
    case OBLIGATORIA = 'obligatoria';
    case OPCIONAL = 'opcional';

    public function etiqueta(): string
    {
        return match ($this) {
            self::OBLIGATORIA => 'Firma obligatoria',
            self::OPCIONAL => 'Firma opcional',
        };
    }

    /** ¿Su ausencia bloquea la remisión/entrega? Solo la obligatoria (C-08). */
    public function bloqueaEntrega(): bool
    {
        return $this === self::OBLIGATORIA;
    }
}
