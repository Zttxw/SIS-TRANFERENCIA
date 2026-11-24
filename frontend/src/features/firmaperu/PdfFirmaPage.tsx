import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueries } from '@tanstack/react-query'
import { ArrowRight, Lock, PenLine, Send } from 'lucide-react'

import { useAuth, useDependenciaActiva } from '@/auth/hooks'
import { puedeConsultarActa } from '@/auth/sesion-runtime'
import { buttonVariants } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useEstadoEntrega } from '@/features/entregas/use-entregas'
import { cn } from '@/lib/utils'
import { estaEnFirma, fueRemitida } from '@/types/transferencia'
import { firmaperuService } from './firmaperu.service'
import { GuiaFirma } from './GuiaFirma'
import { ProgresoFirmasSvg } from './ProgresoFirmasSvg'
import { TarjetaDocumentoFirma } from './TarjetaDocumentoFirma'
import { useRequisitosRemision } from './use-requisitos-remision'
import type { TipoDocumentoFirma } from './firmaperu.types'

const DOCUMENTOS: { tipo: TipoDocumentoFirma; nombre: string }[] = [
  { tipo: 'anexo02', nombre: 'Informe de gestión' },
  { tipo: 'anexo03', nombre: 'Acervo documental' },
  { tipo: 'anexo04', nombre: 'Bienes patrimoniales' },
  { tipo: 'anexo05', nombre: 'Personal' },
  { tipo: 'anexo06', nombre: 'Bienes no patrimoniales' },
  { tipo: 'anexo07', nombre: 'Acta de transferencia' },
  { tipo: 'anexo01', nombre: 'Centros de costo' },
]

/** Documentos que exigen ambas firmas para remitir (el Anexo 01 es institucional). */
const TOTAL_A_FIRMAR = 6

type Filtro = 'todos' | 'por_firmar' | 'firmados'

/**
 * «PDF y firma» del centro de costo activo: el avance de firmas, una guía de
 * los tres pasos y una tarjeta por documento con su hoja ilustrada, sus dos
 * sellos (responsable y coordinador ETTE) y la acción que sigue.
 */
export function PdfFirmaPage() {
  const { permisos, tiene } = useAuth()
  const { dependenciaId } = useDependenciaActiva()
  const { data: entrega, isLoading, isError } = useEstadoEntrega(dependenciaId)
  const puedeRemitir = tiene('entregas.remitir')
  const { data: requisitos } = useRequisitosRemision(dependenciaId, puedeRemitir)
  const soloLectura = !tiene('anexos.registrar') && !tiene('actas.generar')
  const [filtro, setFiltro] = useState<Filtro>('todos')

  const documentos = DOCUMENTOS.filter(({ tipo }) => tipo !== 'anexo07' || puedeConsultarActa(permisos))
  const estados = useQueries({
    queries: documentos.map(({ tipo }) => ({
      queryKey: ['firmaperu', tipo, dependenciaId],
      queryFn: ({ signal }: { signal: AbortSignal }) => firmaperuService.estado(tipo, dependenciaId!, signal),
      enabled: Boolean(dependenciaId),
      retry: false,
      staleTime: 15000,
    })),
  })

  const filas = documentos.map((doc, i) => ({ ...doc, estado: estados[i]?.data, cargando: estados[i]?.isLoading ?? false }))
  const aFirmar = filas.filter((f) => f.tipo !== 'anexo01')
  const firmados = requisitos?.firmados ?? aFirmar.filter((f) => f.estado?.completo).length
  const conteo = {
    todos: filas.length,
    por_firmar: aFirmar.filter((f) => !f.estado?.completo).length,
    firmados: aFirmar.filter((f) => f.estado?.completo).length,
  }
  const visibles = filas.filter((f) =>
    filtro === 'todos' ? true : filtro === 'firmados' ? f.estado?.completo : f.tipo !== 'anexo01' && !f.estado?.completo)

  const estadoEntrega = entrega?.entrega?.estado ?? 'borrador'
  const enFirma = estaEnFirma(estadoEntrega)

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {/* Encabezado con el avance de firmas */}
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-card p-5">
        <div className="flex flex-col gap-5 md:flex-row md:items-center">
          <div className="flex-1 space-y-1">
            <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight">
              <PenLine className="h-5 w-5 text-primary" /> PDF y firma
            </h1>
            {entrega && (
              <p className="text-sm font-medium">
                <span className="mr-1.5 rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{entrega.dependencia.codigo}</span>
                {entrega.dependencia.nombre}
              </p>
            )}
            <p className="max-w-xl text-xs text-muted-foreground">
              Cada documento necesita dos firmas: la del responsable del centro de costo y la del coordinador ETTE,
              que firma presencialmente en esta sesión con su propio certificado. El orden es libre.
            </p>
          </div>
          {dependenciaId && (
            <div className="flex items-center gap-4">
              <div className="h-24 w-24 shrink-0">
                <ProgresoFirmasSvg firmados={firmados} total={TOTAL_A_FIRMAR} />
              </div>
              <div className="space-y-1.5 text-xs">
                <Leyenda color="bg-primary" texto="R · Responsable del CC" />
                <Leyenda color="bg-success" texto="C · Coordinador ETTE" />
                <p className="text-microdato text-muted-foreground">✓ digital · ∿ a mano</p>
              </div>
            </div>
          )}
        </div>
        {dependenciaId && !soloLectura && (
          <GuiaFirma firmanteEtte={entrega?.firmante_ette ?? null} className="mt-5" />
        )}
      </section>

      {!dependenciaId ? (
        <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">Seleccione un centro de costo para consultar sus documentos.</p>
      ) : isLoading ? (
        <div role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground"><Spinner className="h-5 w-5" /> Cargando documentos…</div>
      ) : isError ? (
        <p role="alert" className="rounded-lg border border-danger-border bg-danger-soft p-4 text-sm text-danger-fg">No se pudieron cargar los documentos de esta dependencia.</p>
      ) : (
        <>
          <AvisoEtapa estado={estadoEntrega} enFirma={enFirma} soloLectura={soloLectura} puedeCerrar={puedeRemitir} />

          {/* Filtro */}
          <div role="tablist" aria-label="Filtrar documentos" className="flex flex-wrap gap-1.5">
            {(['todos', 'por_firmar', 'firmados'] as const).map((f) => (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={filtro === f}
                onClick={() => setFiltro(f)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  filtro === f ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted',
                )}
              >
                {f === 'todos' ? 'Todos' : f === 'por_firmar' ? 'Por firmar' : 'Firmados'} ({conteo[f]})
              </button>
            ))}
          </div>

          {visibles.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              {filtro === 'firmados' ? 'Aún no hay documentos con ambas firmas.' : 'No quedan documentos por firmar.'}
            </p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {visibles.map((f) => (
                <TarjetaDocumentoFirma
                  key={f.tipo}
                  tipo={f.tipo}
                  nombre={f.nombre}
                  dependenciaId={dependenciaId}
                  estado={f.estado}
                  cargando={f.cargando}
                  soloLectura={soloLectura}
                />
              ))}
            </div>
          )}

          {puedeRemitir && (
            <div className={cn(
              'flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4',
              requisitos?.puede_remitir ? 'border-success-border bg-success-soft' : 'bg-muted/20',
            )}>
              <p className={cn('text-xs', requisitos?.puede_remitir ? 'font-medium text-success-fg' : 'text-muted-foreground')}>
                {requisitos?.puede_remitir
                  ? 'Los seis documentos tienen ambas firmas. Ya puede remitir la entrega.'
                  : `Documentos con ambas firmas: ${firmados}/${TOTAL_A_FIRMAR}. Al completarlos podrá remitir la entrega.`}
              </p>
              <Link to="/entregas" className={buttonVariants({ size: 'sm', variant: requisitos?.puede_remitir ? 'default' : 'outline', className: 'gap-2' })}>
                {requisitos?.puede_remitir ? <Send className="h-3.5 w-3.5" /> : null}
                Ir a Entrega <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Leyenda({ color, texto }: { color: string; texto: string }) {
  return (
    <p className="flex items-center gap-1.5 font-medium text-foreground">
      <span className={cn('h-2.5 w-2.5 rounded-full', color)} /> {texto}
    </p>
  )
}

/** Explica por qué aún no se firma o qué falta según la etapa de la entrega. */
function AvisoEtapa({ estado, enFirma, soloLectura, puedeCerrar }: { estado: string; enFirma: boolean; soloLectura: boolean; puedeCerrar: boolean }) {
  if (soloLectura || enFirma) return null
  if (fueRemitida(estado)) {
    return (
      <p className="rounded-xl border border-success-border bg-success-soft px-4 py-3 text-xs font-medium text-success-fg">
        La entrega ya fue remitida. Los documentos firmados quedan como consulta.
      </p>
    )
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning-border bg-warning-soft px-4 py-3">
      <p className="flex items-start gap-2 text-xs text-warning-fg">
        <Lock className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          <strong>Las firmas aún no están habilitadas.</strong> Puede generar y revisar los PDF; para firmar, cierre la
          entrega para revisión y firma con el coordinador ETTE.
        </span>
      </p>
      {puedeCerrar && (
        <Link to="/entregas" className={buttonVariants({ size: 'sm', variant: 'outline', className: 'gap-1.5 text-xs' })}>
          Cerrar la entrega <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  )
}
