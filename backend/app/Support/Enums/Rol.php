<?php

declare(strict_types=1);

namespace App\Support\Enums;

/**
 * Roles del sistema (plan §5). Los permisos efectivos se derivan del rol
 * combinado con la dependencia/ámbito asignado (ver AsignacionRol).
 *
 * Directiva 2026 (D-04): `DELEGADO_ETTE` es el **coordinador ETTE** de un centro
 * de costo (el valor interno se conserva por compatibilidad de datos) y `ETTE`
 * es un **titular** del comité, que puede suplir al coordinador ausente.
 */
enum Rol: string
{
    case ADMINISTRADOR = 'administrador';
    case SERVIDOR = 'servidor';
    case RESPONSABLE_CENTRO_COSTO = 'responsable_centro_costo';
    case ETTS = 'etts';
    case ETTE = 'ette';
    case DELEGADO_ETTE = 'delegado_ette';

    public function etiqueta(): string
    {
        return match ($this) {
            self::ADMINISTRADOR => 'Administrador',
            self::SERVIDOR => 'Servidor público',
            self::RESPONSABLE_CENTRO_COSTO => 'Responsable de centro de costo',
            self::ETTS => 'Equipo de Transferencia del Titular Saliente',
            self::ETTE => 'Titular ETTE (comité del Titular Entrante)',
            self::DELEGADO_ETTE => 'Coordinador ETTE',
        };
    }
}
