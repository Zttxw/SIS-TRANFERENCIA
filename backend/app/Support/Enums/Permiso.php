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

    // Cronograma del proceso (RF-007, C-03): administrador y ETTS lo modifican.
    case GestionarCronograma = 'cronograma.gestionar';

    // Anexos: ver, registrar/editar, verificar bienes.
    case VerAnexos = 'anexos.ver';
    case RegistrarAnexos = 'anexos.registrar';
    case VerificarBienes = 'bienes.verificar';

    // Flujo jerárquico de entrega y consolidación.
    case RemitirEntrega = 'entregas.remitir';
    case RevisarEntrega = 'entregas.revisar';
    case ConsolidarEntrega = 'entregas.consolidar';

    // Firma de anexos 02–07 (RF-004/005). La capacidad del delegado ETTE se
    // restringe a las dependencias/documentos para los que está designado
    // (acotado por asignación, no por la sola pertenencia al comité).
    case FirmarAnexos = 'firmas.firmar';

    // Constancia de ausencia de firma ETTE + copia digital (RF-004/005, D-12).
    // El responsable del centro de costo registra que ETTE no firmó su versión y
    // marca la entrega de la copia digital (sin presumir acuse). No es firmar.
    case RegistrarConstanciaAusencia = 'firmas.constancia_ausencia';

    // Gestión del equipo ETTE (RF-008): alta/designación/revocación de delegados
    // por el comité, limitada a su equipo; no es la administración general de
    // usuarios ni de roles institucionales.
    case GestionarDelegados = 'delegados.gestionar';

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
            self::GestionarCronograma => 'Gestionar el cronograma del proceso',
            self::VerAnexos => 'Consultar anexos dentro del ámbito',
            self::RegistrarAnexos => 'Registrar y complementar anexos',
            self::VerificarBienes => 'Verificar bienes patrimoniales',
            self::RemitirEntrega => 'Remitir la entrega al responsable inmediato',
            self::RevisarEntrega => 'Revisar entregas recibidas',
            self::ConsolidarEntrega => 'Consolidar y remitir al nivel superior',
            self::FirmarAnexos => 'Firmar anexos (según designación)',
            self::RegistrarConstanciaAusencia => 'Registrar ausencia de firma ETTE y copia digital',
            self::GestionarDelegados => 'Gestionar delegados ETTE',
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
                self::GestionarCronograma,
                self::VerReportes,
                self::ExportarReportes,
            ],
            // Servidor público: verifica lo precargado y registra lo faltante.
            // La remisión corresponde al responsable.
            Rol::SERVIDOR => [
                self::AccederPlataforma,
                self::VerAnexos,
                self::RegistrarAnexos,
                self::VerificarBienes,
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
                self::RegistrarConstanciaAusencia,
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
                self::RegistrarConstanciaAusencia,
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
            // ETTS: recibe las entregas de 1er/2do nivel, las revisa y consolida
            // institucionalmente (directiva §7.6).
            Rol::ETTS => [
                self::AccederPlataforma,
                self::VerAnexos,
                self::RevisarEntrega,
                self::ConsolidarEntrega,
                self::GenerarActas,
                self::GestionarCronograma,
                self::VerExpediente,
                self::VerReportes,
                self::ExportarReportes,
            ],
            // Comité ETTE: seguimiento institucional (ámbito global) y gestión de
            // su propio equipo de delegados. No firma por sí mismo ni edita datos.
            Rol::ETTE => [
                self::AccederPlataforma,
                self::VerAnexos,
                self::VerExpediente,
                self::VerReportes,
                self::GestionarDelegados,
            ],
            // Delegado ETTE: consulta y firma OPCIONAL acotadas a las
            // dependencias designadas (ámbito por asignación, no global). No
            // edita/elimina datos, no remite, no da visto bueno ni consolida.
            Rol::DELEGADO_ETTE => [
                self::AccederPlataforma,
                self::VerAnexos,
                self::VerExpediente,
                self::FirmarAnexos,
            ],
        };
    }
}
