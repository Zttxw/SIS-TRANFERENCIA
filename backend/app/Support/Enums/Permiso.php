<?php

declare(strict_types=1);

namespace App\Support\Enums;

/**
 * Permisos del sistema de transferencia. Cada rol (App\Support\Enums\Rol)
 * otorga un conjunto inicial de permisos; el mapeo se materializa en la tabla
 * `rol_permiso` (ver RolesPermisosSeeder) para que sea consultable y editable.
 *
 * El ámbito efectivo (qué dependencia) lo fija la asignación de rol, no el
 * permiso: un permiso habilita una acción, no amplía por sí solo el alcance.
 */
enum Permiso: string
{
    // Plataforma y administración.
    case AccederPlataforma = 'plataforma.acceder';
    case GestionarUsuarios = 'usuarios.gestionar';
    case GestionarRoles = 'roles.gestionar';
    case GestionarParametros = 'parametros.gestionar';
    case EjecutarIngestaSgd = 'ingesta.ejecutar';

    // Anexos: ver, registrar/editar, verificar bienes.
    case VerAnexos = 'anexos.ver';
    case RegistrarAnexos = 'anexos.registrar';
    case VerificarBienes = 'bienes.verificar';

    // Flujo jerárquico de entrega y consolidación.
    case RemitirEntrega = 'entregas.remitir';
    case RevisarEntrega = 'entregas.revisar';
    case ConsolidarEntrega = 'entregas.consolidar';

    // Observaciones y subsanaciones.
    case RegistrarObservaciones = 'observaciones.registrar';
    case SubsanarObservaciones = 'observaciones.subsanar';

    // Actas, expediente y reportes.
    case GenerarActas = 'actas.generar';
    case VerExpediente = 'expediente.ver';
    case VerReportes = 'reportes.ver';
    case ExportarReportes = 'reportes.exportar';

    public function etiqueta(): string
    {
        return match ($this) {
            self::AccederPlataforma => 'Acceder a la plataforma',
            self::GestionarUsuarios => 'Gestionar cuentas de usuario',
            self::GestionarRoles => 'Gestionar roles y permisos',
            self::GestionarParametros => 'Gestionar parámetros y configuración',
            self::EjecutarIngestaSgd => 'Ejecutar la ingesta del SGD',
            self::VerAnexos => 'Consultar anexos dentro del ámbito',
            self::RegistrarAnexos => 'Registrar y complementar anexos',
            self::VerificarBienes => 'Verificar bienes patrimoniales',
            self::RemitirEntrega => 'Remitir la entrega al responsable inmediato',
            self::RevisarEntrega => 'Revisar entregas recibidas',
            self::ConsolidarEntrega => 'Consolidar y remitir al nivel superior',
            self::RegistrarObservaciones => 'Registrar observaciones',
            self::SubsanarObservaciones => 'Atender y subsanar observaciones',
            self::GenerarActas => 'Generar actas de transferencia',
            self::VerExpediente => 'Consultar el expediente digital',
            self::VerReportes => 'Consultar reportes de avance',
            self::ExportarReportes => 'Exportar reportes (PDF/Excel)',
        };
    }

    /**
     * Permisos iniciales que otorga cada rol (plan §5). Es el punto de verdad
     * del mapeo que siembra RolesPermisosSeeder.
     *
     * @return list<self>
     */
    public static function inicialesPorRol(Rol $rol): array
    {
        return match ($rol) {
            // Administrador: configuración e ingesta; no recibe acceso a anexos
            // de dependencias por defecto.
            Rol::ADMINISTRADOR => [
                self::AccederPlataforma,
                self::GestionarUsuarios,
                self::GestionarRoles,
                self::GestionarParametros,
                self::EjecutarIngestaSgd,
                self::VerReportes,
                self::ExportarReportes,
            ],
            // Servidor público: verifica lo precargado, registra lo faltante y
            // remite su entrega.
            Rol::SERVIDOR => [
                self::AccederPlataforma,
                self::VerAnexos,
                self::RegistrarAnexos,
                self::VerificarBienes,
                self::RemitirEntrega,
                self::SubsanarObservaciones,
                self::VerExpediente,
            ],
            // Responsable de equipo de trabajo: revisa y consolida a sus
            // integrantes.
            Rol::RESPONSABLE_EQUIPO => [
                self::AccederPlataforma,
                self::VerAnexos,
                self::RegistrarAnexos,
                self::VerificarBienes,
                self::RevisarEntrega,
                self::ConsolidarEntrega,
                self::RegistrarObservaciones,
                self::SubsanarObservaciones,
                self::RemitirEntrega,
                self::VerExpediente,
                self::VerReportes,
            ],
            // Responsable de centro de costo: consolida su dependencia y sus
            // unidades subordinadas.
            Rol::RESPONSABLE_CENTRO_COSTO => [
                self::AccederPlataforma,
                self::VerAnexos,
                self::RegistrarAnexos,
                self::VerificarBienes,
                self::RevisarEntrega,
                self::ConsolidarEntrega,
                self::RegistrarObservaciones,
                self::SubsanarObservaciones,
                self::RemitirEntrega,
                self::GenerarActas,
                self::VerExpediente,
                self::VerReportes,
                self::ExportarReportes,
            ],
            // Coordinador acreditado: verifica y formula observaciones.
            Rol::COORDINADOR => [
                self::AccederPlataforma,
                self::VerAnexos,
                self::RegistrarObservaciones,
                self::VerExpediente,
                self::VerReportes,
                self::ExportarReportes,
            ],
            // ETTS: consulta y consolida la información institucional.
            Rol::ETTS => [
                self::AccederPlataforma,
                self::VerAnexos,
                self::ConsolidarEntrega,
                self::GenerarActas,
                self::VerExpediente,
                self::VerReportes,
                self::ExportarReportes,
            ],
            // ETTE: consulta y verifica dentro de sus atribuciones.
            Rol::ETTE => [
                self::AccederPlataforma,
                self::VerAnexos,
                self::VerExpediente,
                self::VerReportes,
            ],
        };
    }
}
