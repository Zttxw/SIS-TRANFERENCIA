import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Home,
  RefreshCw,
  Search,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import { useAuth } from '@/auth/hooks'
import { useTableroOperativo } from '@/features/dashboard/use-dashboard'
import { RevisarModal } from '@/features/dashboard/RevisarModal'
import { DocumentoFirmaDetalle } from '@/features/firmaperu/DocumentoFirmaDetalle'
import { BotonFirmaPeru } from '@/features/firmaperu/BotonFirmaPeru'
import { FirmaManualDelegado } from '@/features/delegado/FirmaManualDelegado'
import { VistoBuenoDelegadoBar } from '@/features/delegado/VistoBuenoDelegadoBar'
import type { DependenciaSemaforoItem } from '@/types/transferencia'

import {
  anexosDeLaDependencia,
  ESTILO_ESTADO,
  estaRemitida,
  tonoDeCarpeta,
} from './catalogo-anexos'
import { CarpetaSvg } from './CarpetaSvg'
import { HojaAnexoSvg } from './HojaAnexoSvg'

type Perfil = 'ette' | 'etts' | 'delegado' | 'general'

const NOMBRE_NIVEL: Record<number, string> = {
  1: 'Nivel 1 · Alta Dirección',
  2: 'Nivel 2 · Gerencia Municipal',
  3: 'Nivel 3 · Gerencias de Línea',
  4: 'Nivel 4 · Subgerencias y Oficinas',
}

function perfilDe(roles: Set<string>): Perfil {
  if (roles.has('delegado_ette') && !roles.has('ette') && !roles.has('etts') && !roles.has('administrador')) return 'delegado'
  if (roles.has('ette') && !roles.has('etts') && !roles.has('administrador')) return 'ette'
  if (roles.has('etts') && !roles.has('administrador')) return 'etts'
  return 'general'
}

/**
 * Módulo "Anexos de la Entidad" para el portal ETTE/ETTS: un explorador de
 * carpetas SVG donde cada dependencia es una carpeta y sus anexos son hojas de
 * papel. El color comunica la remisión: verde = remitida, gris = sin remitir,
 * ámbar = observada. Reutiliza el tablero operativo (sin endpoints nuevos).
 */
export function AnexosEntidadPage({ perfil: perfilForzado }: { perfil?: Perfil } = {}) {
  const { usuario } = useAuth()
  const { data, isLoading, error, refetch, isFetching } = useTableroOperativo()

  const [busqueda, setBusqueda] = useState('')
  const [soloRemitidas, setSoloRemitidas] = useState<'todas' | 'remitidas' | 'pendientes'>('todas')
  const [abierta, setAbierta] = useState<DependenciaSemaforoItem | null>(null)

  const roles = new Set(usuario?.roles.map(({ rol }) => rol) ?? [])
  const perfil = perfilForzado ?? perfilDe(roles)
  const esDelegado = perfil === 'delegado'

  const { porNivel, totales } = useMemo(() => {
    const deps = data?.dependencias ?? []
    const texto = busqueda.toLowerCase().trim()

    const remitidasTotal = deps.filter((d) => estaRemitida(d.estado_entrega)).length

    const filtradas = deps.filter((d) => {
      const coincideTexto =
        !texto ||
        d.codigo.toLowerCase().includes(texto) ||
        d.nombre.toLowerCase().includes(texto) ||
        `${d.encargado?.nombres ?? ''} ${d.encargado?.apellidos ?? ''}`.toLowerCase().includes(texto)
      const remitida = estaRemitida(d.estado_entrega)
      const coincideEstado =
        soloRemitidas === 'todas' ||
        (soloRemitidas === 'remitidas' ? remitida : !remitida)
      return coincideTexto && coincideEstado
    })

    const grupos = new Map<number, DependenciaSemaforoItem[]>()
    for (const dep of filtradas) {
      const lista = grupos.get(dep.nivel) ?? []
      lista.push(dep)
      grupos.set(dep.nivel, lista)
    }
    const porNivel = [...grupos.entries()]
      .sort(([a], [b]) => a - b)
      .map(([nivel, lista]) => ({
        nivel,
        nombre: NOMBRE_NIVEL[nivel] ?? `Nivel ${nivel}`,
        dependencias: lista.sort((a, b) => a.codigo.localeCompare(b.codigo)),
      }))

    return {
      porNivel,
      totales: {
        total: deps.length,
        remitidas: remitidasTotal,
        pendientes: deps.length - remitidasTotal,
        visibles: filtradas.length,
      },
    }
  }, [data, busqueda, soloRemitidas])

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
        <Spinner className="h-8 w-8 text-primary" />
        <p className="text-xs text-muted-foreground font-medium">
          Cargando el archivo de anexos de la entidad…
        </p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <Card className="border-destructive/30 bg-destructive/5 p-8 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-destructive mb-2" />
        <h3 className="font-semibold text-sm text-foreground">
          No se pudo cargar el archivo de anexos
        </h3>
        <Button size="sm" variant="outline" onClick={() => refetch()} className="mt-4 gap-2">
          <RefreshCw className="h-3.5 w-3.5" /> Reintentar
        </Button>
      </Card>
    )
  }

  const pctRemitidas = totales.total > 0 ? Math.round((totales.remitidas / totales.total) * 100) : 0

  return (
    <div className="mx-auto max-w-[1600px] space-y-5">
      {/* Barra de contexto */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs border-b border-border pb-3">
        <div className="flex items-center gap-2 flex-wrap text-muted-foreground">
          <span className="font-semibold text-foreground uppercase tracking-tight">
            {perfil === 'etts'
              ? 'Equipo de Transferencia Saliente (ETTS)'
              : perfil === 'ette'
                ? 'Comité de Transferencia Entrante (ETTE)'
                : perfil === 'delegado'
                  ? 'Delegado del Comité Entrante (ETTE)'
                  : 'Administración institucional'}
          </span>
          <span>·</span>
          <span className="text-primary font-semibold">
            {esDelegado ? 'Dependencias a mi cargo' : 'Archivo documental del pliego'}
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => refetch()}
          disabled={isFetching}
          className="h-8 text-xs gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
          <span>Actualizar</span>
        </Button>
      </div>

      {/* ===== Encabezado hero con resumen visual de remisión ===== */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-5">
          <div className="flex-1">
            <h1 className="flex items-center gap-2.5 text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              <span className="inline-block h-10 w-12 shrink-0">
                <CarpetaSvg tono="verde" abierta />
              </span>
              {esDelegado ? 'Dependencias a mi cargo' : 'Anexos de la Entidad'}
            </h1>
            <p className="mt-1.5 max-w-2xl text-xs sm:text-sm text-muted-foreground">
              {esDelegado ? (
                <>
                  Revise las dependencias que tiene asignadas: abra cada carpeta para
                  previsualizar y descargar sus anexos, firmarlos (digital o a mano) y
                  dar su visto bueno a lo remitido.
                  Las <strong className="text-success-fg">verdes ya remitieron</strong>;
                  las <strong className="text-muted-foreground">grises aún no</strong>.
                </>
              ) : (
                <>
                  Cada dependencia es una carpeta y cada anexo una hoja de su interior.
                  Las carpetas <strong className="text-success-fg">verdes ya remitieron</strong> su
                  entrega; las <strong className="text-muted-foreground">grises aún no</strong>.
                </>
              )}
            </p>
          </div>

          {/* Tarjetas-resumen con mini carpetas */}
          <div className="grid grid-cols-3 gap-3 shrink-0">
            <ResumenCarpeta tono="verde" valor={totales.remitidas} etiqueta="Remitidas" />
            <ResumenCarpeta tono="gris" valor={totales.pendientes} etiqueta="Sin remitir" />
            <ResumenCarpeta tono="ambar" valor={totales.total} etiqueta="Total" sello={`${pctRemitidas}%`} />
          </div>
        </div>

        {/* Barra de progreso de remisión */}
        <div className="mt-5 space-y-1.5">
          <div className="flex items-center justify-between text-mini text-muted-foreground">
            <span className="font-semibold">Avance de remisión del pliego</span>
            <span className="font-mono font-bold text-success-fg">
              {totales.remitidas}/{totales.total} ({pctRemitidas}%)
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted border border-border">
            <div
              className="h-full rounded-full bg-gradient-to-r from-success to-success/70 transition-all duration-500"
              style={{ width: `${pctRemitidas}%` }}
            />
          </div>
        </div>
      </div>

      {/* Migas de pan + buscador + filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <nav className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <button
            type="button"
            onClick={() => setAbierta(null)}
            className={cn(
              'inline-flex items-center gap-1 rounded-lg px-2 py-1 transition-colors',
              abierta
                ? 'cursor-pointer hover:bg-muted hover:text-foreground'
                : 'font-semibold text-foreground',
            )}
          >
            <Home className="h-3.5 w-3.5" />
            Entidad
          </button>
          {abierta && (
            <>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2 py-1 font-semibold text-primary">
                [{abierta.codigo}] {abierta.nombre}
              </span>
            </>
          )}
        </nav>

        {!abierta && (
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            {/* Chips de filtro por remisión */}
            <div className="flex items-center gap-1.5">
              {(['todas', 'remitidas', 'pendientes'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setSoloRemitidas(f)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-mini font-semibold transition-colors cursor-pointer',
                    soloRemitidas === f
                      ? f === 'remitidas'
                        ? 'border-success-border bg-success-soft text-success-fg'
                        : f === 'pendientes'
                          ? 'border-border bg-muted text-foreground'
                          : 'border-primary/30 bg-primary/10 text-primary'
                      : 'border-border bg-card text-muted-foreground hover:bg-muted',
                  )}
                >
                  {f === 'remitidas' && <span className="h-2 w-2 rounded-full bg-success" />}
                  {f === 'pendientes' && <span className="h-2 w-2 rounded-full bg-muted-foreground/50" />}
                  {f === 'todas' ? 'Todas' : f === 'remitidas' ? 'Remitidas' : 'Sin remitir'}
                </button>
              ))}
            </div>

            <div className="relative sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar dependencia, código o responsable…"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>
        )}
      </div>

      {abierta ? (
        <CarpetaAbierta dependencia={abierta} onCerrar={() => setAbierta(null)} esDelegado={esDelegado} />
      ) : totales.visibles === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          No se encontraron carpetas que coincidan con los filtros aplicados.
        </Card>
      ) : (
        <div className="space-y-7">
          {porNivel.map((grupo) => (
            <section key={grupo.nivel} className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                <span className="px-2 text-foreground">{grupo.nombre}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-mini text-foreground">
                  {grupo.dependencias.length}
                </span>
                <span className="h-px flex-1 bg-border" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
                {grupo.dependencias.map((dep) => (
                  <TarjetaCarpeta key={dep.id} dependencia={dep} onAbrir={() => setAbierta(dep)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

/** Mini tarjeta de resumen del hero con una carpeta SVG. */
function ResumenCarpeta({
  tono,
  valor,
  etiqueta,
  sello,
}: {
  tono: 'verde' | 'gris' | 'ambar'
  valor: number
  etiqueta: string
  sello?: string
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card/70 px-3 py-2.5 backdrop-blur-sm">
      <div className="relative h-9 w-11">
        <CarpetaSvg tono={tono} />
      </div>
      <span className="font-mono text-lg font-extrabold leading-none text-foreground">
        {sello ?? valor}
      </span>
      <span className="text-microdato font-medium uppercase tracking-tight text-muted-foreground">
        {etiqueta}
      </span>
    </div>
  )
}

/** Carpeta cerrada en la cuadrícula: SVG + metadatos, se abre al pulsar. */
function TarjetaCarpeta({
  dependencia,
  onAbrir,
}: {
  dependencia: DependenciaSemaforoItem
  onAbrir: () => void
}) {
  const tono = tonoDeCarpeta(dependencia.estado_entrega)
  const remitida = estaRemitida(dependencia.estado_entrega)
  const [hover, setHover] = useState(false)

  return (
    <button
      type="button"
      onClick={onAbrir}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      className={cn(
        'group relative flex flex-col items-center gap-2 rounded-2xl border bg-card p-4 text-center transition-all',
        'hover:-translate-y-1 hover:shadow-lg cursor-pointer',
        tono === 'verde'
          ? 'border-success-border hover:border-success'
          : tono === 'ambar'
            ? 'border-warning-border hover:border-warning'
            : 'border-border hover:border-muted-foreground/40',
      )}
    >
      {/* Insignia de estado */}
      <span
        className={cn(
          'absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-microdato font-bold',
          remitida
            ? 'border-success-border bg-success-soft text-success-fg'
            : tono === 'ambar'
              ? 'border-warning-border bg-warning-soft text-warning-fg'
              : 'border-border bg-muted text-muted-foreground',
        )}
      >
        {remitida ? <CheckCircle2 className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
        {dependencia.estado_entrega === 'consolidada'
          ? 'Cerrada'
          : remitida
            ? 'Remitida'
            : tono === 'ambar'
              ? 'Observada'
              : 'Sin remitir'}
      </span>

      {/* Carpeta SVG */}
      <div className="h-20 w-24 drop-shadow-sm">
        <CarpetaSvg tono={tono} abierta={hover} />
      </div>

      {/* Alerta de observaciones */}
      {dependencia.observaciones_abiertas > 0 && (
        <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-0.5 rounded-full bg-destructive/10 px-1.5 py-0.5 text-microdato font-bold text-destructive">
          <AlertTriangle className="h-3 w-3" />
          {dependencia.observaciones_abiertas}
        </span>
      )}

      <div className="min-w-0 w-full">
        <p className="font-mono text-mini font-bold text-primary">[{dependencia.codigo}]</p>
        <p
          className="truncate text-xs font-semibold uppercase leading-tight text-foreground"
          title={dependencia.nombre}
        >
          {dependencia.nombre}
        </p>
      </div>
    </button>
  )
}

/**
 * Carpeta abierta: cabecera + anexos como hojas de papel SVG. Cada hoja reutiliza
 * `DocumentoFirmaDetalle` (previsualizar + descargar el PDF oficial, en modo solo
 * lectura). Si la entrega está remitida y el usuario puede revisar, muestra la
 * barra de dictamen (aceptar / observar) reutilizando `RevisarModal`.
 */
function CarpetaAbierta({
  dependencia,
  onCerrar,
  esDelegado = false,
}: {
  dependencia: DependenciaSemaforoItem
  onCerrar: () => void
  esDelegado?: boolean
}) {
  const { tiene } = useAuth()
  const tono = tonoDeCarpeta(dependencia.estado_entrega)
  const remitida = estaRemitida(dependencia.estado_entrega)
  const anexos = anexosDeLaDependencia(dependencia)
  const [modalRevisar, setModalRevisar] = useState(false)

  // El dictamen (aceptar/observar) aplica a entregas remitidas aún sin
  // consolidar, y solo para quien puede revisar. El backend valida el ámbito.
  const enRevision =
    dependencia.estado_entrega === 'remitida' || dependencia.estado_entrega === 'en_revision'
  const puedeDictaminar = enRevision && tiene('entregas.revisar')

  return (
    <Card
      className={cn(
        'overflow-hidden border shadow-sm',
        tono === 'verde'
          ? 'border-success-border'
          : tono === 'ambar'
            ? 'border-warning-border'
            : 'border-border',
      )}
    >
      {/* Cabecera de la carpeta */}
      <div
        className={cn(
          'flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center',
          tono === 'verde' ? 'bg-success-soft' : tono === 'ambar' ? 'bg-warning-soft' : 'bg-muted',
        )}
      >
        <div className="flex items-center gap-3">
          <div className="h-14 w-16 shrink-0 drop-shadow-sm">
            <CarpetaSvg tono={tono} abierta />
          </div>
          <div>
            <p className="font-mono text-mini font-bold text-primary">[{dependencia.codigo}]</p>
            <h2 className="text-sm font-bold uppercase text-foreground">{dependencia.nombre}</h2>
            {dependencia.encargado && (
              <p className="text-microdato text-muted-foreground">
                {dependencia.encargado.apellidos}, {dependencia.encargado.nombres}
                {dependencia.encargado.cargo ? ` · ${dependencia.encargado.cargo}` : ''}
              </p>
            )}
            <span
              className={cn(
                'mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-microdato font-bold',
                remitida
                  ? 'border-success-border bg-card text-success-fg'
                  : tono === 'ambar'
                    ? 'border-warning-border bg-card text-warning-fg'
                    : 'border-border bg-card text-muted-foreground',
              )}
            >
              {remitida ? <CheckCircle2 className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
              {dependencia.estado_entrega === 'consolidada'
                ? 'Entrega consolidada'
                : remitida
                  ? 'Entrega remitida'
                  : tono === 'ambar'
                    ? 'Observada — en subsanación'
                    : 'Entrega sin remitir'}
            </span>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={onCerrar}
          className="h-8 gap-1.5 text-xs cursor-pointer sm:ml-auto"
        >
          <ChevronRight className="h-3.5 w-3.5 rotate-180" />
          Volver a las carpetas
        </Button>
      </div>

      {/* Visto bueno del delegado ETTE sobre lo remitido (GAP 2). */}
      {esDelegado && (
        <VistoBuenoDelegadoBar
          dependenciaId={dependencia.id}
          dependenciaNombre={dependencia.nombre}
          remitida={remitida}
        />
      )}

      {/* Barra de dictamen: aceptar (consolidar) u observar lo remitido */}
      {puedeDictaminar && (
        <div className="flex flex-col gap-2 border-b border-border bg-info-soft/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2 text-xs text-info-fg">
            <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="leading-snug">
              <span className="font-bold">Entrega remitida para su revisión.</span> Revise los
              anexos y emita su dictamen: acéptela para consolidarla, u obsérvela para devolverla
              a subsanación.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setModalRevisar(true)}
            className="h-9 shrink-0 gap-1.5 bg-primary text-xs font-semibold text-white hover:bg-primary-hover cursor-pointer"
          >
            <ClipboardCheck className="h-4 w-4" />
            Aceptar u observar
          </Button>
        </div>
      )}

      {/* Hojas de papel (anexos) */}
      <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {anexos.map((anexo) => {
          const estilo = ESTILO_ESTADO[anexo.estado]
          const folio = anexo.codigo.replace(/\D/g, '')
          return (
            <div
              key={anexo.codigo}
              className="flex gap-3 rounded-xl border border-border bg-card p-3 transition-all hover:border-primary/40 hover:shadow-md"
            >
              {/* Hoja SVG */}
              <div className="h-24 w-[72px] shrink-0 drop-shadow-sm">
                <HojaAnexoSvg estado={anexo.estado} folio={folio} />
              </div>

              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-mini font-bold text-muted-foreground">{anexo.codigo}</p>
                    <p className="text-xs font-semibold leading-tight text-foreground" title={anexo.nombre}>
                      {anexo.nombre}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-microdato font-semibold',
                      estilo.chip,
                    )}
                  >
                    <span className={cn('h-1.5 w-1.5 rounded-full', estilo.punto)} />
                    {estilo.etiqueta}
                  </span>
                </div>

                <p className="mt-1 text-microdato leading-snug text-muted-foreground">{anexo.detalle}</p>

                {/* Previsualizar + descargar el PDF oficial (módulo de firma, solo lectura) */}
                <div className="mt-auto space-y-2 pt-2">
                  <DocumentoFirmaDetalle
                    tipoDocumento={anexo.tipoFirma}
                    dependenciaId={dependencia.id}
                    soloLectura
                  />

                  {/* Acciones de firma del delegado: digital (Firma Perú) o manual.
                      Excluye el Anexo 01, que el delegado no firma. */}
                  {esDelegado && anexo.tipoFirma !== 'anexo01' && (
                    <div className="flex flex-wrap items-center justify-end gap-1.5 border-t border-dashed border-border pt-2">
                      <span className="mr-auto text-microdato font-semibold uppercase tracking-wide text-muted-foreground">
                        Firma del delegado (opcional)
                      </span>
                      <BotonFirmaPeru tipoDocumento={anexo.tipoFirma} dependenciaId={dependencia.id} compacto />
                      <FirmaManualDelegado tipoDocumento={anexo.tipoFirma} dependenciaId={dependencia.id} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <RevisarModal
        open={modalRevisar}
        onClose={() => setModalRevisar(false)}
        dependenciaId={dependencia.id}
        dependenciaNombre={dependencia.nombre}
      />
    </Card>
  )
}
