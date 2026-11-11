<?php

declare(strict_types=1);

namespace App\Support\Enums;

/**
 * Roles del sistema (plan §5). Los permisos efectivos se derivan del rol
 * combinado con la dependencia/ámbito asignado (ver AsignacionRol).
 */
enum Rol: string
{
    case ADMINISTRADOR = 'administrador';
    case SERVIDOR = 'servidor';
    case RESPONSABLE_EQUIPO = 'responsable_equipo';
    case RESPONSABLE_CENTRO_COSTO = 'responsable_centro_costo';
    case COORDINADOR = 'coordinador';
    case ETTS = 'etts';
    case ETTE = 'ette';
    case DELEGADO_ETTE = 'delegado_ette';

    public function etiqueta(): string
    {
        return match ($this) {
            self::ADMINISTRADOR => 'Administrador',
            self::SERVIDOR => 'Servidor público',
            self::RESPONSABLE_EQUIPO => 'Responsable de equipo de trabajo',
            self::RESPONSABLE_CENTRO_COSTO => 'Responsable de centro de costo',
            self::COORDINADOR => 'Coordinador acreditado',
            self::ETTS => 'Equipo de Transferencia del Titular Saliente',
            self::ETTE => 'Comité del Equipo de Transferencia del Titular Entrante',
            self::DELEGADO_ETTE => 'Delegado ETTE por dependencia',
        };
    }
}
