import { useState } from 'react'
import { AlertCircle, FileUp, Paperclip, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { useSubirEvidencia } from './use-acta'

interface SubirEvidenciaModalProps {
  open: boolean
  onClose: () => void
  actaId: number
}

export function SubirEvidenciaModal({
  open,
  onClose,
  actaId,
}: SubirEvidenciaModalProps) {
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
      setErrorLocal(null)
      setArchivo(file)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!archivo) {
      setErrorLocal('Seleccione el archivo que desea adjuntar.')
      return
    }

    subirMutation.mutate(
      {
        archivo,
        tipo: 'acta',
        id: actaId,
        descripcion: descripcion.trim() || archivo.name,
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
      <Card className="relative w-full max-w-lg border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Paperclip className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Adjuntar Evidencia al Expediente
              </h2>
              <p className="text-xs text-muted-foreground">Custodia segura con hash SHA-256</p>
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
          <div className="space-y-2">
            <Label htmlFor="archivo-evidencia" className="text-xs font-medium">
              Archivo de Evidencia (PDF, JPG, PNG, XLSX, ZIP) <span className="text-destructive">*</span>
            </Label>
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-input p-4 transition hover:border-primary/50">
              <FileUp className="h-7 w-7 text-muted-foreground" />
              <p className="mt-2 text-xs font-medium text-foreground">
                {archivo ? archivo.name : 'Seleccione o arrastre el archivo de sustento'}
              </p>
              <p className="text-nota text-muted-foreground">Hasta 25 MB por archivo</p>
              <Input
                id="archivo-evidencia"
                type="file"
                className="mt-2 text-xs"
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
            <Label htmlFor="desc-evidencia" className="text-xs font-medium">
              Descripción / Referencia del documento
            </Label>
            <Textarea
              id="desc-evidencia"
              rows={2}
              placeholder="Ej: Registro fotográfico del inventario físico / Informe de archivo..."
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
                  Subiendo...
                </>
              ) : (
                <>
                  <FileUp className="h-4 w-4" />
                  Guardar Evidencia
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

