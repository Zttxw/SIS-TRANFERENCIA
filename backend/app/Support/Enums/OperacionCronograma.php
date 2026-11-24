<?php

declare(strict_types=1);

namespace App\Support\Enums;

/**
 * Etapa que gobierna una actividad del cronograma (directiva §7.6.1) y, por
 * tanto, qué acciones bloquea su vencimiento:
 *
 * - `ninguna`: actividades informativas (acreditación de coordinadores,
 *   reunión de coordinación). No bloquean.
 * - `verificacion` (actividad 3): cerrar la entrega y pasarla a firma.
 * - `acta` (actividad 4): firmar los anexos y remitir.
 * - `remision`: remitir.
 */
enum OperacionCronograma: string
{
    case NINGUNA = 'ninguna';
    case VERIFICACION = 'verificacion';
    case ACTA = 'acta';
    case REMISION = 'remision';

    public function etiqueta(): string
    {
        return match ($this) {
            self::NINGUNA => 'Informativa (no bloquea)',
            self::VERIFICACION => 'Revisión y verificación (actividad 3)',
            self::ACTA => 'Suscripción del acta (actividad 4)',
            self::REMISION => 'Remisión',
        };
    }

    /** @return list<AccionPlazo> */
    public function accionesBloqueadas(): array
    {
        return match ($this) {
            self::NINGUNA => [],
            self::VERIFICACION => [AccionPlazo::PRESENTAR],
            self::ACTA => [AccionPlazo::FIRMAR, AccionPlazo::REMITIR],
            self::REMISION => [AccionPlazo::REMITIR],
        };
    }

    /**
     * Etapas cuyo vencimiento bloquea la acción.
     *
     * @return list<self>
     */
    public static function queBloquean(AccionPlazo $accion): array
    {
        return array_values(array_filter(
            self::cases(),
            fn (self $operacion): bool => in_array($accion, $operacion->accionesBloqueadas(), true),
        ));
    }
}
