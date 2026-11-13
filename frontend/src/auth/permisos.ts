/**
 * ESPEJO DEL BACKEND — mantener en sincronía con:
 *   - `App\Support\Enums\Permiso`  (códigos de permiso)
 *   - `App\Support\Enums\Rol`      (códigos de rol)
 *   - `Permiso::inicialesPorRol()` (mapa rol -> permisos)
 *
 * El frontend NO reimplementa el ámbito (dependencia/subárbol): confía en el
 * backend, donde un 403 significa "fuera de ámbito o sin permiso". Aquí solo
 * se deriva el set de permisos del usuario para ocultar/deshabilitar controles
 * que, de lo contrario, producirían un 403 (plan §5).
 *
 * Al cambiar el backend, actualizar ESTE archivo en el mismo PR.
 */

/** Códigos de permiso — espejo de `Permiso: string`. */
export const PERMISOS = {
  // Plataforma y administración.
  AccederPlataforma: 'plataforma.acceder',
  GestionarUsuarios: 'usuarios.gestionar',
  GestionarRoles: 'roles.gestionar',
  GestionarParametros: 'parametros.gestionar',
  EjecutarIngestaSgd: 'ingesta.ejecutar',
  GestionarCronograma: 'cronograma.gestionar',
  // Anexos.
  VerAnexos: 'anexos.ver',
  RegistrarAnexos: 'anexos.registrar',
  VerificarBienes: 'bienes.verificar',
  // Flujo jerárquico.
  RemitirEntrega: 'entregas.remitir',
  RevisarEntrega: 'entregas.revisar',
  ConsolidarEntrega: 'entregas.consolidar',
  // Firma y gestión de delegados ETTE.
  FirmarAnexos: 'firmas.firmar',
  RegistrarConstanciaAusencia: 'firmas.constancia_ausencia',
  GestionarDelegados: 'delegados.gestionar',
  DarVistoBuenoDelegado: 'delegado.visto_bueno',
  // Observaciones.
  RegistrarObservaciones: 'observaciones.registrar',
  SubsanarObservaciones: 'observaciones.subsanar',
  // Actas, expediente, reportes.
  GenerarActas: 'actas.generar',
  VerExpediente: 'expediente.ver',
  VerReportes: 'reportes.ver',
  ExportarReportes: 'reportes.exportar',
} as const

export type Permiso = (typeof PERMISOS)[keyof typeof PERMISOS]

/** Códigos de rol — espejo de `Rol: string`. */
export const ROLES = {
  Administrador: 'administrador',
  Servidor: 'servidor',
  ResponsableEquipo: 'responsable_equipo',
  ResponsableCentroCosto: 'responsable_centro_costo',
  Coordinador: 'coordinador',
  Etts: 'etts',
  Ette: 'ette',
  DelegadoEtte: 'delegado_ette',
} as const

export type RolCodigo = (typeof ROLES)[keyof typeof ROLES]

/**
 * Permisos iniciales que otorga cada rol — espejo de
 * `Permiso::inicialesPorRol()`. Cualquier divergencia aquí se traduce en
 * controles de UI que el backend rechazará (o que la UI oculta de más).
 */
const PERMISOS_POR_ROL: Record<RolCodigo, readonly Permiso[]> = {
  [ROLES.Administrador]: [
    PERMISOS.AccederPlataforma,
    PERMISOS.GestionarUsuarios,
    PERMISOS.GestionarRoles,
    PERMISOS.GestionarParametros,
    PERMISOS.EjecutarIngestaSgd,
    PERMISOS.GestionarCronograma,
    PERMISOS.VerReportes,
    PERMISOS.ExportarReportes,
  ],
  [ROLES.Servidor]: [
    PERMISOS.AccederPlataforma,
    PERMISOS.VerAnexos,
    PERMISOS.RegistrarAnexos,
    PERMISOS.VerificarBienes,
    PERMISOS.SubsanarObservaciones,
    PERMISOS.VerExpediente,
  ],
  [ROLES.ResponsableEquipo]: [
    PERMISOS.AccederPlataforma,
    PERMISOS.VerAnexos,
    PERMISOS.RegistrarAnexos,
    PERMISOS.VerificarBienes,
    PERMISOS.RevisarEntrega,
    PERMISOS.ConsolidarEntrega,
    PERMISOS.RegistrarObservaciones,
    PERMISOS.SubsanarObservaciones,
    PERMISOS.RemitirEntrega,
    PERMISOS.RegistrarConstanciaAusencia,
    PERMISOS.VerExpediente,
    PERMISOS.VerReportes,
  ],
  [ROLES.ResponsableCentroCosto]: [
    PERMISOS.AccederPlataforma,
    PERMISOS.VerAnexos,
    PERMISOS.RegistrarAnexos,
    PERMISOS.VerificarBienes,
    PERMISOS.RevisarEntrega,
    PERMISOS.ConsolidarEntrega,
    PERMISOS.RegistrarObservaciones,
    PERMISOS.SubsanarObservaciones,
    PERMISOS.RemitirEntrega,
    PERMISOS.RegistrarConstanciaAusencia,
    PERMISOS.GenerarActas,
    PERMISOS.VerExpediente,
    PERMISOS.VerReportes,
    PERMISOS.ExportarReportes,
  ],
  [ROLES.Coordinador]: [
    PERMISOS.AccederPlataforma,
    PERMISOS.VerAnexos,
    PERMISOS.RegistrarObservaciones,
    PERMISOS.VerExpediente,
    PERMISOS.VerReportes,
    PERMISOS.ExportarReportes,
  ],
  [ROLES.Etts]: [
    PERMISOS.AccederPlataforma,
    PERMISOS.VerAnexos,
    PERMISOS.RevisarEntrega,
    PERMISOS.ConsolidarEntrega,
    PERMISOS.GenerarActas,
    PERMISOS.GestionarCronograma,
    PERMISOS.VerExpediente,
    PERMISOS.VerReportes,
    PERMISOS.ExportarReportes,
  ],
  [ROLES.Ette]: [
    PERMISOS.AccederPlataforma,
    PERMISOS.VerAnexos,
    PERMISOS.VerExpediente,
    PERMISOS.VerReportes,
    PERMISOS.GestionarDelegados,
  ],
  [ROLES.DelegadoEtte]: [
    PERMISOS.AccederPlataforma,
    PERMISOS.VerAnexos,
    PERMISOS.VerExpediente,
    PERMISOS.FirmarAnexos,
    PERMISOS.DarVistoBuenoDelegado,
  ],
}

/**
 * Deriva el set de permisos efectivos de un usuario como la unión de los
 * permisos de todos sus roles (un usuario puede tener varias asignaciones).
 */
export function derivarPermisos(
  roles: readonly { rol: RolCodigo }[],
): Set<Permiso> {
  const permisos = new Set<Permiso>()
  for (const { rol } of roles) {
    const otorgados = PERMISOS_POR_ROL[rol]
    if (!otorgados) continue
    for (const permiso of otorgados) permisos.add(permiso)
  }
  return permisos
}
