import { useEffect, useRef, useState } from 'react'
import { Eye, Loader2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import { firmaperuService } from './firmaperu.service'
import type { TipoDocumentoFirma } from './firmaperu.types'

interface Props {
  tipoDocumento: TipoDocumentoFirma
  dependenciaId: number
  etiqueta?: string
  soloGenerado?: boolean
}

export function PrevisualizarAnexo(props: Props) {
  const [abierto, setAbierto] = useState(false)
  return <>
    <Tooltip content="Previsualización">
      <Button size={props.etiqueta ? 'sm' : 'icon'} variant={props.etiqueta ? 'outline' : 'ghost'} className={props.etiqueta ? 'gap-2' : 'h-8 w-8 text-muted-foreground hover:text-foreground'} aria-label={props.etiqueta ?? 'Previsualización'} onClick={() => setAbierto(true)}>
        <Eye className="h-4 w-4" />
        {props.etiqueta}
      </Button>
    </Tooltip>
    {abierto && <VisorAnexo {...props} onCerrar={() => setAbierto(false)} />}
  </>
}

function VisorAnexo({ tipoDocumento, dependenciaId, soloGenerado = false, onCerrar }: Props & { onCerrar: () => void }) {
  const dialogo = useRef<HTMLDialogElement>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    dialogo.current?.showModal()
    const controller = new AbortController()
    let archivoUrl: string | undefined
    void firmaperuService.previsualizar(tipoDocumento, dependenciaId, controller.signal, soloGenerado)
      .then((blob) => {
        if (controller.signal.aborted) return
        archivoUrl = URL.createObjectURL(blob)
        setUrl(archivoUrl)
      })
      .catch(() => {
        if (!controller.signal.aborted) setError('No se pudo generar la previsualización. Revise sus permisos y vuelva a intentarlo.')
      })
    return () => {
      controller.abort()
      if (archivoUrl) URL.revokeObjectURL(archivoUrl)
    }
  }, [tipoDocumento, dependenciaId, soloGenerado])

  return <dialog ref={dialogo} onCancel={onCerrar} aria-labelledby="titulo-previsualizacion"
    className="fixed inset-0 m-auto h-[92dvh] max-h-none w-[96vw] max-w-6xl flex-col overflow-hidden rounded-xl border bg-card p-0 text-foreground shadow-2xl backdrop:bg-black/60 open:flex">
    <div className="flex items-start justify-between gap-4 border-b bg-primary/5 p-4">
      <div>
        <h2 id="titulo-previsualizacion" className="flex items-center gap-2 text-lg font-semibold"><Eye className="h-5 w-5 text-primary" /> Previsualización del {tipoDocumento.replace('anexo', 'Anexo ')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">PDF con los datos guardados. Guarde primero sus cambios y vuelva a abrir esta vista antes de firmar.</p>
      </div>
      <Button variant="ghost" size="sm" onClick={onCerrar} aria-label="Cerrar previsualización"><X className="h-5 w-5" /></Button>
    </div>
    {url ? <>
      <div className="border-b px-4 py-2 text-xs text-muted-foreground">Si su navegador no muestra el PDF, <a href={url} download={`Previsualizacion-${tipoDocumento}.pdf`} className="font-semibold text-primary underline">descárguelo aquí</a>.</div>
      <iframe src={url} title={`PDF del ${tipoDocumento}`} className="min-h-0 w-full flex-1 bg-slate-100" />
    </> : <div role="status" className="flex flex-1 items-center justify-center gap-3 p-8 text-sm">
      {error || <><Loader2 className="h-6 w-6 animate-spin text-primary" /> Generando su anexo…</>}
    </div>}
  </dialog>
}
