import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BadgeCheck, CheckCircle2, Loader2, Undo2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { notificarError } from '@/lib/api-errors'

import { delegadoService } from './delegado.service'

interface Props {
  dependenciaId: number
  dependenciaNombre: string
  /** La entrega está remitida (requisito para aprobar). */
  remitida: boolean
}

/**
 * Barra de visto bueno del delegado ETTE (GAP 2 del portal del delegado) sobre lo
 * remitido por una dependencia asignada. Es una constancia de conformidad acotada
 * a su ámbito: NO consolida ni cambia el estado de la entrega. Solo se habilita
 * cuando la entrega ya está remitida; el backend valida ámbito y rol.
 */
export function VistoBuenoDelegadoBar({ dependenciaId, dependenciaNombre, remitida }: Props) {
  const clave = ['delegado-visto-bueno', dependenciaId]
  const cliente = useQueryClient()
  const confirmar = useConfirm()

  const { data, isLoading } = useQuery({
    queryKey: clave,
    queryFn: ({ signal }) => delegadoService.vistoBueno(dependenciaId, signal),
    staleTime: 15000,
  })

  const aprobar = useMutation({
    mutationFn: () => delegadoService.aprobar(dependenciaId),
    onSuccess: (vb) => {
      cliente.setQueryData(clave, vb)
      toast.success('Visto bueno registrado.')
    },
    onError: notificarError,
  })

  const retirar = useMutation({
    mutationFn: () => delegadoService.retirar(dependenciaId),
    onSuccess: (vb) => {
      cliente.setQueryData(clave, vb)
      toast.info('Visto bueno retirado.')
    },
    onError: notificarError,
  })

  const aprobado = data?.aprobado === true
  const ocupado = aprobar.isPending || retirar.isPending

  const alRetirar = async () => {
    const ok = await confirmar({
      title: 'Retirar su visto bueno',
      description: `Se retirará su constancia de conformidad sobre [${dependenciaNombre}]. Podrá volver a darla cuando desee.`,
      confirmText: 'Retirar visto bueno',
    })
    if (ok) retirar.mutate()
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 p-4 text-xs text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Consultando su visto bueno…
      </div>
    )
  }

  return (
    <div
      className={
        'flex flex-col gap-2 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between ' +
        (aprobado ? 'bg-success-soft/60' : 'bg-info-soft/50')
      }
    >
      <div className={'flex items-start gap-2 text-xs ' + (aprobado ? 'text-success-fg' : 'text-info-fg')}>
        {aprobado ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" />}
        <p className="leading-snug">
          {aprobado ? (
            <>
              <span className="font-bold">Usted dio su visto bueno</span> a lo remitido por esta
              dependencia.
              {data?.otorgado_en && (
                <span className="text-muted-foreground"> · {new Date(data.otorgado_en).toLocaleString('es-PE')}</span>
              )}{' '}
              Es una constancia de conformidad; no consolida la entrega.
            </>
          ) : remitida ? (
            <>
              <span className="font-bold">Revise los anexos remitidos.</span> Si está conforme,
              registre su visto bueno como delegado. Es una constancia opcional que no reemplaza la
              consolidación del ETTS.
            </>
          ) : (
            <>
              <span className="font-bold">Entrega aún no remitida.</span> Podrá dar su visto bueno
              cuando la dependencia remita su entrega.
            </>
          )}
        </p>
      </div>

      {aprobado ? (
        <Button
          size="sm"
          variant="outline"
          disabled={ocupado}
          onClick={() => void alRetirar()}
          className="h-9 shrink-0 gap-1.5 text-xs"
        >
          {retirar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />}
          Retirar visto bueno
        </Button>
      ) : (
        <Button
          size="sm"
          disabled={ocupado || !remitida}
          onClick={() => aprobar.mutate()}
          className="h-9 shrink-0 gap-1.5 bg-success text-xs font-semibold text-white hover:bg-success/90"
        >
          {aprobar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
          Dar visto bueno
        </Button>
      )}
    </div>
  )
}
