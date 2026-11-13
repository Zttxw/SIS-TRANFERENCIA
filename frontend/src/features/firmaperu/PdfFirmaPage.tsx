import { Link } from 'react-router-dom'
import { ArrowRight, PenLine } from 'lucide-react'

import { useAuth, useDependenciaActiva } from '@/auth/hooks'
import { puedeConsultarActa } from '@/auth/sesion-runtime'
import { buttonVariants } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useEstadoEntrega } from '@/features/dashboard/use-dashboard'
import { ConstanciaAusenciaEtte } from './ConstanciaAusenciaEtte'
import { DocumentoFirmaDetalle } from './DocumentoFirmaDetalle'
import { useRequisitosRemision } from './use-requisitos-remision'
import type { TipoDocumentoFirma } from './firmaperu.types'

const ANEXOS: { tipo: TipoDocumentoFirma; nombre: string }[] = [
  { tipo: 'anexo01', nombre: 'Centros de costo' },
  { tipo: 'anexo02', nombre: 'Informe de gestión' },
  { tipo: 'anexo03', nombre: 'Acervo documental' },
  { tipo: 'anexo04', nombre: 'Bienes patrimoniales' },
  { tipo: 'anexo05', nombre: 'Personal' },
  { tipo: 'anexo06', nombre: 'Bienes no patrimoniales' },
  { tipo: 'anexo07', nombre: 'Acta de transferencia' },
]

export function PdfFirmaPage() {
  const { permisos, tiene } = useAuth()
  const { dependenciaId } = useDependenciaActiva()
  const { data: estado, isLoading, isError } = useEstadoEntrega(dependenciaId)
  const { data: requisitos, isFetching: comprobando, isError: errorFirmas } = useRequisitosRemision(dependenciaId, tiene('entregas.remitir'))
  const soloLectura = !tiene('anexos.registrar') && !tiene('actas.generar') && !tiene('firmas.firmar')
  const anexos = ANEXOS.filter(({ tipo }) => tipo !== 'anexo07' || puedeConsultarActa(permisos))

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="space-y-1 border-b pb-4">
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          <PenLine className="h-5 w-5 text-primary" /> PDF y firma
        </h1>
        <p className="text-xs text-muted-foreground">Visualice el borrador → genere el PDF → firme.</p>
        {estado && <p className="pt-1 text-xs font-medium">[{estado.dependencia.codigo}] {estado.dependencia.nombre}</p>}
      </div>

      {!dependenciaId ? (
        <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">Seleccione un centro de costo para consultar sus documentos.</p>
      ) : isLoading ? (
        <div role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground"><Spinner className="h-5 w-5" /> Cargando documentos…</div>
      ) : isError ? (
        <p role="alert" className="rounded-lg border border-danger-border bg-danger-soft p-4 text-sm text-danger-fg">No se pudieron cargar los documentos de esta dependencia.</p>
      ) : (
        <>
          <div className="divide-y rounded-xl border bg-card">
            {anexos.map(({ tipo, nombre }) => (
              <section key={tipo} id={tipo} className="scroll-mt-6 space-y-3 p-4">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <span className="rounded bg-primary/10 px-2 py-1 font-mono text-xs text-primary">{tipo.slice(-2)}</span>
                  {nombre}
                </h2>
                <DocumentoFirmaDetalle tipoDocumento={tipo} dependenciaId={dependenciaId} soloLectura={soloLectura} />
                {tipo === 'anexo07' && !soloLectura && <ConstanciaAusenciaEtte dependenciaId={dependenciaId} />}
              </section>
            ))}
          </div>
          {tiene('entregas.remitir') && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 p-4">
              <p className="text-xs text-muted-foreground">
                {comprobando ? 'Comprobando firmas…' : errorFirmas ? 'No se pudieron comprobar las firmas.' : `Firmas del jefe: ${requisitos?.firmados ?? 0}/6 · anexos 02 al 07`}
              </p>
              <Link to="/entregas" className={buttonVariants({ size: 'sm', variant: requisitos?.puede_remitir ? 'default' : 'outline', className: 'gap-2' })}>
                Ir a Entrega <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  )
}
