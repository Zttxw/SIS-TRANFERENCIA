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
