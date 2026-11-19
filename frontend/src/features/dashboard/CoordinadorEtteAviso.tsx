import { useQuery } from '@tanstack/react-query'
import { UserCheck } from 'lucide-react'

import { delegadosService } from '@/features/delegados/delegados.service'

/**
 * Aviso al responsable del CC: quién es su coordinador ETTE y si fue
 * reemplazado en los últimos días (RF-15, F-12).
 */
export function CoordinadorEtteAviso({ dependenciaId }: { dependenciaId: number }) {
  const { data } = useQuery({
    queryKey: ['coordinadores-ette', 'mis-centros'],
    queryFn: delegadosService.misCoordinadores,
    staleTime: 5 * 60 * 1000,
  })
  const centro = data?.find((c) => c.dependencia.id === dependenciaId)
  if (!centro) return null

  const coordinadores = centro.coordinadores.map((c) =>
    [c.nombre, c.correo, c.celular].filter(Boolean).join(' · '),
  )

  return (
    <div className="space-y-1 rounded-xl border border-info-border bg-info-soft/60 p-3 text-xs text-info-fg sm:px-4">
      <p className="flex items-center gap-2 font-semibold">
        <UserCheck className="h-4 w-4 shrink-0" />
        Coordinador ETTE: {coordinadores.length > 0 ? coordinadores.join(' / ') : 'sin coordinador acreditado'}
      </p>
      {centro.reemplazos.map((r) => (
        <p key={`${r.fecha}-${r.nuevo}`}>
          El {r.fecha ? new Date(r.fecha).toLocaleDateString('es-PE') : '—'} se reemplazó a {r.anterior ?? '—'} por {r.nuevo}
          {r.motivo ? ` (motivo: ${r.motivo})` : ''}.
        </p>
      ))}
    </div>
  )
}
