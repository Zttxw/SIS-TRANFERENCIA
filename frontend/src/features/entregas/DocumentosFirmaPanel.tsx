import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, FileSignature, FileText, Loader2 } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BotonFirmaPeru } from '@/features/firmaperu/BotonFirmaPeru'
import { BotonGenerarPdf } from '@/features/firmaperu/BotonGenerarPdf'
import { firmaperuService } from '@/features/firmaperu/firmaperu.service'
import type { EstadoFirma, TipoDocumentoFirma } from '@/features/firmaperu/firmaperu.types'
import type { EstadoEntrega } from '@/types/transferencia'

interface DocumentoDef {
  tipo: TipoDocumentoFirma
  etiqueta: string
  nombre: string
}

// Documentos que se firman en «Mi entrega»: anexos 02-06 (orden libre) + acta 07
// al final. El anexo 01 (organigrama) se firma en su propio módulo.
const DOCUMENTOS: DocumentoDef[] = [
  { tipo: 'anexo02', etiqueta: 'Anexo 02', nombre: 'Informe de Gestión' },
  { tipo: 'anexo03', etiqueta: 'Anexo 03', nombre: 'Acervo Documental' },
  { tipo: 'anexo04', etiqueta: 'Anexo 04', nombre: 'Inventario Patrimonial' },
  { tipo: 'anexo05', etiqueta: 'Anexo 05', nombre: 'Personal a Cargo' },
  { tipo: 'anexo06', etiqueta: 'Anexo 06', nombre: 'Bienes No Patrimoniales' },
  { tipo: 'anexo07', etiqueta: 'Anexo 07', nombre: 'Acta de Transferencia' },
]

interface Props {
  dependenciaId: number
  estadoEntrega?: EstadoEntrega | null
}

/**
 * Panel de firma por documento en «Mi entrega» (plan 07, F3-3). Concentra toda
 * la firma: una fila por documento (02-07) con su estado, versiones firmadas y
 * la acción de firmar (reusa BotonFirmaPeru). El acta 07 solo se firma con la
 * entrega consolidada (gate 409 ya existente); hasta entonces su firma se
 * deshabilita con una nota.
 */
export function DocumentosFirmaPanel({ dependenciaId, estadoEntrega }: Props) {
  const consolidada = estadoEntrega === 'consolidada'

  return (
    <Card className="border shadow-xs">
      <CardHeader className="bg-muted/15 pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileSignature className="h-4 w-4 text-primary" /> Firma de los documentos de la entrega
        </CardTitle>
        <CardDescription className="text-xs">
          Genere el PDF de cada documento y fírmelo con Firma Perú. El acta (Anexo 07) se firma al final,
          una vez consolidada la entrega. Las versiones (v1, v2…) solo existen a partir de la primera firma.
        </CardDescription>
      </CardHeader>
      <CardContent className="divide-y p-0">
        {DOCUMENTOS.map((doc) => (
          <FilaDocumento
            key={doc.tipo}
            doc={doc}
            dependenciaId={dependenciaId}
            bloqueado={doc.tipo === 'anexo07' && !consolidada}
          />
        ))}
      </CardContent>
    </Card>
  )
}

function FilaDocumento({ doc, dependenciaId, bloqueado }: { doc: DocumentoDef; dependenciaId: number; bloqueado: boolean }) {
  const { data: estado, isLoading } = useQuery<EstadoFirma>({
    queryKey: ['firmaperu', doc.tipo, dependenciaId],
    queryFn: ({ signal }) => firmaperuService.estado(doc.tipo, dependenciaId, signal),
    retry: false,
    staleTime: 15000,
  })

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
      <div className="min-w-0">
        <p className="text-sm font-medium">
          <span className="font-mono text-xs text-muted-foreground">{doc.etiqueta}</span> · {doc.nombre}
        </p>
        <div className="mt-0.5 text-xs">
          {isLoading ? (
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Consultando…
            </span>
          ) : (
            <EstadoDocumento estado={estado} />
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {estado && !estado.borrador_generado && !estado.firmado && (
          <BotonGenerarPdf tipoDocumento={doc.tipo} dependenciaId={dependenciaId} />
        )}
        {bloqueado ? (
          <span className="rounded-md border border-dashed px-2.5 py-1 text-xs text-muted-foreground">
            Requiere entrega consolidada
          </span>
        ) : (
          <BotonFirmaPeru tipoDocumento={doc.tipo} dependenciaId={dependenciaId} />
        )}
      </div>
    </div>
  )
}

function EstadoDocumento({ estado }: { estado?: EstadoFirma }) {
  if (!estado) return <span className="text-muted-foreground">Sin información</span>

  if (estado.firmado && estado.vigente !== false) {
    return (
      <span className="inline-flex items-center gap-1.5 font-medium text-success-fg">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Firmado{estado.version ? ` v${estado.version}` : ''}
        {estado.firmado_en && ` · ${new Date(estado.firmado_en).toLocaleDateString('es-PE')}`}
      </span>
    )
  }

  if (estado.firmado && estado.vigente === false) {
    return (
      <span className="text-warning-fg">
        Firma anterior no vigente · los datos cambiaron, vuelva a firmar
      </span>
    )
  }

  if (estado.pendiente_validacion) {
    return <span className="text-warning-fg">PDF recibido · verificación pendiente</span>
  }

  if (estado.borrador_generado) {
    return (
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        <FileText className="h-3.5 w-3.5" /> PDF generado · sin firmar
      </span>
    )
  }

  return <span className="text-muted-foreground">PDF no generado</span>
}
