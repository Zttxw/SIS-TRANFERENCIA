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
  // Verificación ETTE y cadena ETTS → ETTE (directiva 2026).
  VerificarEntrega: 'entregas.verificar',
  RecibirEntregaEtts: 'entregas.recibir_etts',
  RemitirEntregaEtte: 'entregas.remitir_ette',
  RecibirEntregaEtte: 'entregas.recibir_ette',
  // Firma y gestión de coordinadores ETTE.
  FirmarAnexos: 'firmas.firmar',
  GestionarDelegados: 'delegados.gestionar',
  // Observaciones.
  RegistrarObservaciones: 'observaciones.registrar',
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
  ResponsableCentroCosto: 'responsable_centro_costo',
  Etts: 'etts',
  /** Titular ETTE (comité). */
  Ette: 'ette',
  /** Coordinador ETTE de un centro de costo (valor interno histórico). */
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
    PERMISOS.VerExpediente,
  ],
  [ROLES.ResponsableCentroCosto]: [
    PERMISOS.AccederPlataforma,
    PERMISOS.VerAnexos,
    PERMISOS.RegistrarAnexos,
    PERMISOS.VerificarBienes,
    PERMISOS.RemitirEntrega,
    PERMISOS.GenerarActas,
    PERMISOS.VerExpediente,
    PERMISOS.VerReportes,
    PERMISOS.ExportarReportes,
  ],
  [ROLES.Etts]: [
    PERMISOS.AccederPlataforma,
    PERMISOS.VerAnexos,
    PERMISOS.RecibirEntregaEtts,
    PERMISOS.RemitirEntregaEtte,
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
    PERMISOS.FirmarAnexos,
    PERMISOS.RegistrarObservaciones,
    PERMISOS.VerificarEntrega,
    PERMISOS.RecibirEntregaEtte,
  ],
  [ROLES.DelegadoEtte]: [
    PERMISOS.AccederPlataforma,
    PERMISOS.VerAnexos,
    PERMISOS.VerExpediente,
    PERMISOS.FirmarAnexos,
    PERMISOS.RegistrarObservaciones,
    PERMISOS.VerificarEntrega,
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
