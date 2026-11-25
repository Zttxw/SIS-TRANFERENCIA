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

    // Entrega del CC: el responsable la presenta a revisión y la remite.
    case RemitirEntrega = 'entregas.remitir';

    // Directiva 2026 (D-12): cadena ETTS → ETTE de la entrega.
    case RecibirEntregaEtts = 'entregas.recibir_etts';
    case RemitirEntregaEtte = 'entregas.remitir_ette';
    case RecibirEntregaEtte = 'entregas.recibir_ette';

    // Gestión de coordinadores ETTE (RF-13, RF-15, D-10): alta por web o Excel,
    // designación, reemplazo y revocación por el comité, limitada a su equipo;
    // no es la administración general de usuarios ni de roles institucionales.
    case GestionarDelegados = 'delegados.gestionar';

    // Observaciones del coordinador ETTE: constancia, sin subsanación (D-07).
    // Las registra el responsable del CC a nombre del coordinador presente.
    case RegistrarObservaciones = 'observaciones.registrar';

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
            self::RemitirEntrega => 'Presentar a revisión y remitir la entrega del centro de costo',
            self::RecibirEntregaEtts => 'Registrar la recepción de entregas en el ETTS',
            self::RemitirEntregaEtte => 'Enviar entregas del ETTS al ETTE',
            self::RecibirEntregaEtte => 'Registrar la recepción de entregas en el ETTE',
            self::GestionarDelegados => 'Gestionar coordinadores ETTE',
            self::RegistrarObservaciones => 'Registrar observaciones',
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
            // Administrador: plataforma, gestión institucional y supervisión técnica/operativa de anexos.
            Rol::ADMINISTRADOR => [
                self::AccederPlataforma,
                self::GestionarUsuarios,
                self::GestionarRoles,
                self::GestionarParametros,
                self::EjecutarIngestaSgd,
                self::GestionarCronograma,
                self::VerReportes,
                self::ExportarReportes,
                self::VerAnexos,
                self::RegistrarAnexos,
                self::VerificarBienes,
                self::VerExpediente,
            ],
            // Servidor público: verifica lo precargado y registra lo faltante.
            // La remisión corresponde al responsable.
            Rol::SERVIDOR => [
                self::AccederPlataforma,
                self::VerAnexos,
                self::RegistrarAnexos,
                self::VerificarBienes,
                self::VerExpediente,
            ],
            // Responsable de centro de costo: prepara la entrega de su CC, la cierra
            // para firma y, en su sesión, el coordinador ETTE presente registra sus
            // observaciones y firma; luego remite. Ve lo que envían sus CC hijos,
            // pero solo lo consolida: no lo observa ni lo devuelve (D-08).
            Rol::RESPONSABLE_CENTRO_COSTO => [
                self::AccederPlataforma,
                self::VerAnexos,
                self::RegistrarAnexos,
                self::VerificarBienes,
                self::RemitirEntrega,
                self::RegistrarObservaciones,
                self::GenerarActas,
                self::VerExpediente,
                self::VerReportes,
                self::ExportarReportes,
            ],
            // ETTS: recibe las entregas de los CC sin padre en el Anexo 01 y las
            // envía al ETTE (directiva §7.6).
            Rol::ETTS => [
                self::AccederPlataforma,
                self::VerAnexos,
                self::RecibirEntregaEtts,
                self::RemitirEntregaEtte,
                self::GenerarActas,
                self::GestionarCronograma,
                self::VerExpediente,
                self::VerReportes,
                self::ExportarReportes,
            ],
            // Titular ETTE (comité): seguimiento institucional (ámbito global),
            // gestión de los coordinadores, recepción final y firma del Anexo 01.
            // En suplencia del coordinador firma los anexos de un CC en la sesión
            // del responsable, con su certificado (D-04; ver CoordinacionEtte).
            // Las firmas de los CC no dependen de un permiso: las opera el
            // responsable y el certificado identifica al firmante.
            Rol::ETTE => [
                self::AccederPlataforma,
                self::VerAnexos,
                self::VerExpediente,
                self::VerReportes,
                self::GestionarDelegados,
                self::RecibirEntregaEtte,
            ],
            // Coordinador ETTE: consulta los CC que tiene asignados (ámbito
            // exacto por asignación). Revisa y firma presencialmente en la
            // sesión del responsable del CC; desde su cuenta no opera.
            Rol::DELEGADO_ETTE => [
                self::AccederPlataforma,
                self::VerAnexos,
                self::VerExpediente,
            ],
        };
    }
}
