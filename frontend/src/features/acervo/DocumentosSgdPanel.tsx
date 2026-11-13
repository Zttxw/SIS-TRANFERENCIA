import { useEffect, useMemo, useState } from 'react'
import { Eye, FileText, Loader2, Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { useDocumentosSgd } from './use-acervo'
import { VisorPdfSgd } from './VisorPdfSgd'
import type { DocumentoSgd } from '@/types/acervo'

interface DocumentosSgdPanelProps {
  acervoId: number
  /** Nombre de la serie (tipo documental), sólo para rótulos. */
  serie: string
}

const PESADO_BYTES = 8 * 1024 * 1024 // 8 MB: se recomienda abrir en pestaña.

function formatoFecha(iso: string | null): string {
  if (!iso) return '—'
  const [a, m, d] = iso.split('-')
  return d && m && a ? `${d}/${m}/${a}` : iso
}

function formatoPeso(bytes: number): string {
  if (bytes <= 0) return '—'
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Lista en vivo los documentos del SGD que respaldan una fila-resumen de acervo
 * digital. Búsqueda por asunto (debounce), paginación en servidor y visor del
 * documento principal embebido. Solo se monta cuando la serie está expandida,
 * así la consulta al SGD se hace bajo demanda.
 */
export function DocumentosSgdPanel({ acervoId, serie }: DocumentosSgdPanelProps) {
  const [textoBusqueda, setTextoBusqueda] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [page, setPage] = useState(1)
  const [verDoc, setVerDoc] = useState<DocumentoSgd | null>(null)

  // Debounce de la búsqueda (evita golpear el SGD en cada tecla).
  useEffect(() => {
    const t = setTimeout(() => {
      setBusqueda(textoBusqueda.trim())
      setPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [textoBusqueda])

  const filtros = useMemo(
    () => ({ search: busqueda || undefined, page, per_page: 15 }),
    [busqueda, page],
  )

  const { data, isLoading, isFetching, error } = useDocumentosSgd(acervoId, filtros, true)

  const documentos = data?.data ?? []
  const meta = data?.meta

  return (
    <div className="space-y-3 bg-muted/20 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-nota font-medium text-muted-foreground">
          <FileText className="h-3.5 w-3.5 text-primary" />
          Documentos del SGD · «{serie}»
          {isFetching && !isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
        </p>
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={textoBusqueda}
            onChange={(e) => setTextoBusqueda(e.target.value)}
            placeholder="Buscar por asunto…"
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Consultando el SGD…
        </div>
      ) : error ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No se pudieron cargar los documentos del SGD.
        </p>
      ) : documentos.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {busqueda
            ? `Sin documentos cuyo asunto contenga «${busqueda}».`
            : 'No hay documentos del SGD para esta serie.'}
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 font-medium">N.° Doc.</th>
                  <th className="px-3 py-2 font-medium">Fecha</th>
                  <th className="px-3 py-2 font-medium">Asunto</th>
                  <th className="px-3 py-2 text-center font-medium">Folios</th>
                  <th className="px-3 py-2 text-right font-medium">Documento</th>
                </tr>
              </thead>
              <tbody>
                {documentos.map((doc) => {
                  const pesado = doc.bytes_pdf >= PESADO_BYTES
                  return (
                    <tr key={doc.emi} className="border-b border-border/50 last:border-0">
                      <td className="whitespace-nowrap px-3 py-2 font-medium text-foreground">
                        {doc.numero_documento ?? `—`}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                        {formatoFecha(doc.fecha)}
                      </td>
                      <td className="max-w-md px-3 py-2">
                        <p className="truncate text-foreground" title={doc.asunto}>
                          {doc.asunto}
                        </p>
                      </td>
                      <td className="px-3 py-2 text-center text-muted-foreground">
                        {doc.folios ?? '—'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right">
                        {doc.tiene_pdf ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1.5"
                            onClick={() => setVerDoc(doc)}
                            title={
                              pesado
                                ? `Documento pesado (${formatoPeso(doc.bytes_pdf)}); se recomienda abrir en pestaña.`
                                : `Ver documento (${formatoPeso(doc.bytes_pdf)})`
                            }
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Ver
                            <span className="text-mini text-muted-foreground">
                              {formatoPeso(doc.bytes_pdf)}
                            </span>
                          </Button>
                        ) : (
                          <span className="text-mini text-muted-foreground">Sin archivo</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {meta && (
            <Pagination
              currentPage={meta.current_page}
              lastPage={meta.last_page}
              total={meta.total}
              onPageChange={setPage}
              disabled={isFetching}
            />
          )}
        </div>
      )}

      {verDoc && (
        <VisorPdfSgd
          acervoId={acervoId}
          documento={verDoc}
          onClose={() => setVerDoc(null)}
        />
      )}
    </div>
  )
}
