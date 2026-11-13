interface UsuarioRegistroProps {
  usuario?: { name: string } | null
  fecha?: string | null
  fuente?: string | null
  sinUsuario?: string
}

export function UsuarioRegistro({ usuario, fecha, fuente, sinUsuario = 'Sin usuario registrado' }: UsuarioRegistroProps) {
  const origen = fuente && ['sgd', 'siga'].includes(fuente.toLowerCase())
    ? `Precarga ${fuente.toUpperCase()}`
    : sinUsuario
  const fechaRegistro = fecha ? new Date(fecha) : null

  return (
    <span className="block text-xs print:hidden">
      <span className="block font-medium text-foreground">{usuario?.name || origen}</span>
      {fechaRegistro && !Number.isNaN(fechaRegistro.getTime()) && (
        <time dateTime={fecha ?? undefined} className="block text-nota text-muted-foreground">
          {fechaRegistro.toLocaleString('es-PE', {
            timeZone: 'America/Lima',
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
          })}
        </time>
      )}
    </span>
  )
}
