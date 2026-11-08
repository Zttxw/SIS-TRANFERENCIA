import { useState } from 'react'
import { AlertCircle, FileCheck, FileUp, Info, ShieldCheck, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { useSubirEvidencia } from './use-acta'

interface FirmaDigitalSeamModalProps {
  open: boolean
  onClose: () => void
  actaId: number
  numeroActa: string
}

export function FirmaDigitalSeamModal({
  open,
  onClose,
  actaId,
  numeroActa,
}: FirmaDigitalSeamModalProps) {
  const [archivo, setArchivo] = useState<File | null>(null)
  const [descripcion, setDescripcion] = useState('')
  const [errorLocal, setErrorLocal] = useState<string | null>(null)

  const subirMutation = useSubirEvidencia()

  if (!open) return null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.size > 25 * 1024 * 1024) {
        setErrorLocal('El archivo no debe exceder los 25 MB.')
        setArchivo(null)
        return
      }
      if (file.type !== 'application/pdf') {
        setErrorLocal('Únicamente se admiten documentos en formato PDF oficial.')
        setArchivo(null)
        return
      }
      setErrorLocal(null)
      setArchivo(file)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!archivo) {
      setErrorLocal('Debe seleccionar el documento en PDF del acta suscrita.')
      return
    }

    subirMutation.mutate(
      {
        archivo,
        tipo: 'acta',
        id: actaId,
        descripcion: descripcion.trim() || `Acta de transferencia suscrita ${numeroActa}`,
      },
      {
        onSuccess: () => {
          setArchivo(null)
          setDescripcion('')
          onClose()
        },
      }
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <Card className="relative w-full max-w-xl border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Suscripción Oficial y Firma Digital
              </h2>
              <p className="font-mono text-xs text-muted-foreground">{numeroActa}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {/* Seam de Firma Digital - Nota Institucional */}
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-xs text-muted-foreground">
            <div className="flex items-start gap-2.5">
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="space-y-1">
                <span className="font-semibold text-foreground">
                  Seam de Integración PKI / Firma Digital (Directiva N.° 001-2026-MDSJ/A §7.10)
                </span>
                <p className="leading-relaxed">
                  El conector de firma digital nativa con token criptográfico / RENIEC se encuentra en proceso de
                  despliegue normativo. Como mecanismo oficial de contingencia, los intervinientes pueden
                  imprimir el acta, formalizar la suscripción (física o con firma electrónica) y adjuntar el PDF
                  suscrito para su custodia y hashing en el storage seguro del expediente.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="archivo-pdf" className="text-xs font-medium">
              Documento del Acta Suscrita (PDF) <span className="text-destructive">*</span>
            </Label>
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-input p-5 transition hover:border-primary/50">
              <FileUp className="h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-xs font-medium text-foreground">
                {archivo ? archivo.name : 'Haga clic para examinar o arrastre el archivo aquí'}
              </p>
              <p className="text-[11px] text-muted-foreground">Formato PDF hasta 25 MB</p>
              <Input
                id="archivo-pdf"
                type="file"
                accept=".pdf,application/pdf"
                className="mt-3 text-xs"
                onChange={handleFileChange}
              />
            </div>
            {errorLocal && (
              <p className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5" />
                {errorLocal}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="descripcion" className="text-xs font-medium">
              Nota / Descripción del documento suscrito
            </Label>
            <Textarea
              id="descripcion"
              rows={2}
              placeholder="Ej: Acta suscrita con firmas del titular saliente y coordinador acreditado ETTE..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="text-xs resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={subirMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              className="gap-2"
              disabled={subirMutation.isPending || !archivo}
            >
              {subirMutation.isPending ? (
                <>
                  <Spinner className="h-4 w-4" />
                  Almacenando en Expediente...
                </>
              ) : (
                <>
                  <FileCheck className="h-4 w-4" />
                  Adjuntar Acta Suscrita
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

