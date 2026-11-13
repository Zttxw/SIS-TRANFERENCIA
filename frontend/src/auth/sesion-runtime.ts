/** Una respuesta de una sesión anterior no debe cerrar la cuenta que acaba de ingresar. */
export function perteneceASesionActual(authorization: unknown, token: string | null): boolean {
  return Boolean(token) && authorization === `Bearer ${token}`
}

/** La salida local no espera al servidor; la revocación conserva su propio token. */
export function cerrarSesionSinEspera(revocar: () => Promise<void>, limpiar: () => void): Promise<void> {
  const revocacion = revocar()
  limpiar()
  return revocacion.catch(() => undefined)
}

/** La API del acta admite emisión por el responsable o firma por el delegado ETTE. */
export function puedeConsultarActa(permisos: ReadonlySet<string>): boolean {
  return permisos.has('actas.generar') || permisos.has('firmas.firmar')
}

/** El destino recordado puede pertenecer a otra cuenta que usó este navegador. */
export function destinoPermitidoSesion(destino: unknown, permisos: ReadonlySet<string>): string {
  if (typeof destino !== 'string' || !destino.startsWith('/') || destino.startsWith('//') || destino.includes('\\')) {
    return '/'
  }

  const ruta = destino.split(/[?#]/)[0].replace(/\/+$/, '') || '/'
  if (ruta === '/login') return '/'
  if (ruta === '/acta' && !puedeConsultarActa(permisos)) return '/'

  const restricciones: Record<string, string> = {
    '/usuarios': 'usuarios.gestionar',
    '/admin': 'usuarios.gestionar',
    '/cronograma': 'cronograma.gestionar',
    '/delegados': 'delegados.gestionar',
    '/reportes': 'reportes.ver',
    '/pdf-firma': 'anexos.ver',
  }
  const permiso = restricciones[ruta]
  return permiso && !permisos.has(permiso) ? '/' : destino
}
