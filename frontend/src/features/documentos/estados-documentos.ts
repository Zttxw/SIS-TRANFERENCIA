export function nombreEstadoDocumento(estado: string | null | undefined): string {
  switch (estado) {
    case '0':
      return 'No leído'
    case '1':
      return 'Recibido sin atender'
    case null:
    case undefined:
    case '':
    case 'SIN ESTADO':
      return 'Sin estado informado'
    default:
      return estado
  }
}
