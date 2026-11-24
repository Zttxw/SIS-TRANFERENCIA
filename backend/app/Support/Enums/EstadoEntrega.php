<?php

declare(strict_types=1);

namespace App\Support\Enums;

/**
 * Estado de la entrega de un centro de costo (directiva 2026, plan §3.1).
 *
 * borrador → en_revision → acta_suscrita → remitida. El responsable cierra la
 * entrega y la pasa a firma; en su sesión, el coordinador ETTE (o un titular
 * suplente) revisa, deja observaciones de constancia (D-07) y firma con su
 * certificado: firmar es aprobar. Con ambos lados firmados en los anexos 02 al
 * 07 (D-05) el responsable remite al CC padre o al ETTS.
 *
 * Solo la entrega dirigida al ETTS sigue la cadena institucional (D-12):
 * recibida_etts → remitida_ette → recibida_ette (estado final). La del CC hijo
 * queda `remitida`: su padre la consolida (D-08).
 */
enum EstadoEntrega: string
{
    case BORRADOR = 'borrador';
    case EN_REVISION = 'en_revision';
    case ACTA_SUSCRITA = 'acta_suscrita';
    case REMITIDA = 'remitida';
    case RECIBIDA_ETTS = 'recibida_etts';
    case REMITIDA_ETTE = 'remitida_ette';
    case RECIBIDA_ETTE = 'recibida_ette';

    public function etiqueta(): string
    {
        return match ($this) {
            self::BORRADOR => 'Borrador',
            self::EN_REVISION => 'En revisión y firma',
            self::ACTA_SUSCRITA => 'Acta suscrita',
            self::REMITIDA => 'Remitida',
            self::RECIBIDA_ETTS => 'Recibida por el ETTS',
            self::REMITIDA_ETTE => 'Enviada al ETTE',
            self::RECIBIDA_ETTE => 'Recibida por el ETTE',
        };
    }

    /** Los anexos solo se editan mientras se preparan, antes de presentarlos. */
    public function admiteEdicion(): bool
    {
        return $this === self::BORRADOR;
    }

    /**
     * Los anexos 02 al 07 se firman con la entrega cerrada para revisión. En
     * `acta_suscrita` se admite volver a firmar si un cambio de datos invalidó
     * las firmas.
     */
    public function admiteFirma(): bool
    {
        return $this === self::EN_REVISION || $this === self::ACTA_SUSCRITA;
    }

    /** ¿La entrega ya salió del centro de costo hacia su CC padre o el ETTS? */
    public function fueRemitida(): bool
    {
        return in_array($this, [self::REMITIDA, self::RECIBIDA_ETTS, self::REMITIDA_ETTE, self::RECIBIDA_ETTE], true);
    }

    /** ¿El ETTE ya registró la recepción? Cierra el flujo de la entrega. */
    public function esFinal(): bool
    {
        return $this === self::RECIBIDA_ETTE;
    }

    /**
     * Estados de la cadena ETTS → ETTE, en orden.
     *
     * @return list<self>
     */
    public static function cadenaInstitucional(): array
    {
        return [self::REMITIDA, self::RECIBIDA_ETTS, self::REMITIDA_ETTE, self::RECIBIDA_ETTE];
    }
}
