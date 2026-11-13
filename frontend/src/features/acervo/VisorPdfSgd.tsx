import { useEffect, useState } from 'react'
import { Download, ExternalLink, FileWarning, Loader2, X } from 'lucide-react'

import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { notificarError } from '@/lib/api-errors'
import { acervoService } from './acervo.service'
import type { DocumentoSgd } from '@/types/acervo'

interface VisorPdfSgdProps {
  acervoId: number
  documento: DocumentoSgd
  onClose: () => void
}

/**
 * Visor embebido del documento principal (PDF) de un documento del SGD. Trae el
 * binario autenticado como Blob y lo muestra en un `<iframe>` (object URL), con
 * botones de descarga y «abrir en pestaña». El PDF se sirve inline por streaming
 * desde el SGD; aquí sólo se gestiona la vista y el ciclo de vida del object URL.
 */
export function VisorPdfSgd({ acervoId, documento, onClose }: VisorPdfSgdProps) {
  const [url, setUrl] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const controlador = new AbortController()
    let objectUrl: string | null = null
    setCargando(true)
    setError(false)

    acervoService
      .pdfDocumentoSgd(acervoId, documento.emi, controlador.signal)
      .then((u) => {
        objectUrl = u
        setUrl(u)
      })
      .catch((e) => {
        if (controlador.signal.aborted) return
        setError(true)
        notificarError(e)
      })
      .finally(() => {
        if (!controlador.signal.aborted) setCargando(false)
      })

    return () => {
      controlador.abort()
      if (objectUrl) window.URL.revokeObjectURL(objectUrl)
    }
  }, [acervoId, documento.emi])

  // Cerrar con Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const titulo = documento.numero_documento
    ? `Documento ${documento.numero_documento}`
    : `Documento ${documento.emi}`

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/70 backdrop-blur-sm p-4 sm:p-6">
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-xl border bg-card shadow-xl">
        <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-foreground">{titulo}</h2>
            <p className="truncate text-nota text-muted-foreground">{documento.asunto}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {url && (
              <>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Pestaña</span>
                </a>
                <a
                  href={url}
                  download={`SGD-${documento.emi}.pdf`}
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Descargar</span>
                </a>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onClose}
              aria-label="Cerrar visor"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </header>

        <div className="relative flex-1 bg-muted/30">
          {cargando && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-sm">Cargando documento del SGD…</p>
            </div>
          )}
          {error && !cargando && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <FileWarning className="h-8 w-8 text-warning-fg" />
              <p className="text-sm">No se pudo mostrar el documento.</p>
            </div>
          )}
          {url && !error && (
            <iframe
              title={titulo}
              src={url}
              className="h-full w-full border-0"
            />
          )}
        </div>
      </div>
    </div>
  )
}
