import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Home,
  MessageSquareText,
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
import { DocumentoFirmaDetalle } from '@/features/firmaperu/DocumentoFirmaDetalle'
import { useObservaciones } from '@/features/observaciones/use-observaciones'
import { ANEXOS_OBSERVABLES_CONFIG } from '@/types/observaciones'
import { estaEnFirma, type DependenciaSemaforoItem } from '@/types/transferencia'

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
 * papel. El color comunica el estado: verde = remitida, ámbar = en revisión y
 * firma con el coordinador, gris = en preparación. Reutiliza el
 * tablero operativo.
 */
export function AnexosEntidadPage({ perfil: perfilForzado }: { perfil?: Perfil } = {}) {
  const { usuario } = useAuth()
  const { data, isLoading, error, refetch, isFetching } = useTableroOperativo()

  const [busqueda, setBusqueda] = useState('')
  const [soloRemitidas, setSoloRemitidas] = useState<'todas' | 'en_firma' | 'remitidas' | 'pendientes'>('todas')
  const [abierta, setAbierta] = useState<DependenciaSemaforoItem | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()

  const roles = new Set(usuario?.roles.map(({ rol }) => rol) ?? [])
  const perfil = perfilForzado ?? perfilDe(roles)
  const esDelegado = perfil === 'delegado'

  // Abrir carpeta automáticamente si viene indicada en la URL (?dependenciaId=... o ?codigo=...)
  const depParam = searchParams.get('dependenciaId') || searchParams.get('codigo')

  useEffect(() => {
    if (!depParam || !data?.dependencias || data.dependencias.length === 0) return
    const match = data.dependencias.find(
      (d) => String(d.id) === depParam || d.codigo.toLowerCase() === depParam.toLowerCase(),
    )
    if (match) {
      setAbierta(match)
    }
  }, [data?.dependencias, depParam])

  // Mantener 'abierta' sincronizada con datos actualizados
  useEffect(() => {
    if (abierta && data?.dependencias) {
      const match = data.dependencias.find((d) => d.id === abierta.id)
      if (match && match !== abierta) {
        setAbierta(match)
      }
    }
  }, [data?.dependencias, abierta])

  const abrirCarpeta = (dep: DependenciaSemaforoItem) => {
    setAbierta(dep)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('dependenciaId', String(dep.id))
      return next
    })
  }

  const cerrarCarpeta = () => {
    setAbierta(null)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('dependenciaId')
      next.delete('codigo')
      return next
    })
  }

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
        (soloRemitidas === 'en_firma'
          ? estaEnFirma(d.estado_entrega)
          : soloRemitidas === 'remitidas'
            ? remitida
            : !remitida)
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
    <div className="mx-auto max-w-[1600px] space-y-5 bg-[var(--hielo)] p-1 sm:p-2 rounded-2xl">
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
          <span className="text-[var(--primario)] font-semibold">
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
            <h1 className="flex items-center gap-2.5 text-xl sm:text-2xl font-bold tracking-tight text-[var(--primario)]">
              <span className="inline-block h-10 w-12 shrink-0">
                <CarpetaSvg tono="verde" abierta />
              </span>
              {esDelegado ? 'Dependencias a mi cargo' : 'Anexos de la Entidad'}
            </h1>
            <p className="mt-1.5 max-w-2xl text-xs sm:text-sm text-muted-foreground">
              {esDelegado ? (
                <>
                  Consulte los centros de costo que tiene asignados. La revisión y la firma se
                  hacen presencialmente en la sesión del responsable del CC: allí se registran sus
                  observaciones y usted firma con su certificado, lo que aprueba cada documento.
                  Las <strong className="text-warning-fg">carpetas ámbar</strong> están en revisión y
                  firma; las <strong className="text-success-fg">verdes ya remitieron</strong>.
                </>
              ) : (
                <>
                  Cada centro de costo es una carpeta y cada anexo una hoja de su interior.
                  Las carpetas <strong className="text-success-fg">verdes ya remitieron</strong> su
                  entrega; las <strong className="text-warning-fg">ámbar</strong> están en revisión y firma
                  con el coordinador; las <strong className="text-muted-foreground">grises</strong> siguen en preparación.
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
            <span className="font-mono font-bold text-[var(--secundario)]">
              {totales.remitidas}/{totales.total} ({pctRemitidas}%)
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted border border-border">
            <div
              className="h-full rounded-full bg-[var(--secundario)] transition-all duration-500"
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
            onClick={cerrarCarpeta}
            className={cn(
              'inline-flex items-center gap-1 rounded-lg px-2 py-1 transition-colors',
              abierta
                ? 'cursor-pointer hover:bg-muted text-[var(--primario)]'
                : 'font-semibold text-[var(--primario)]',
            )}
          >
            <Home className="h-3.5 w-3.5" />
            Entidad
          </button>
          {abierta && (
            <>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2 py-1 font-semibold text-[var(--primario)]">
                [{abierta.codigo}] {abierta.nombre}
              </span>
            </>
          )}
        </nav>

        {!abierta && (
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            {/* Chips de filtro por remisión */}
            <div className="flex items-center gap-1.5">
              {(['todas', 'en_firma', 'remitidas', 'pendientes'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setSoloRemitidas(f)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-mini font-semibold transition-colors cursor-pointer',
                    soloRemitidas === f
                      ? f === 'todas'
                        ? 'border-[var(--primario)] bg-[var(--primario)] text-white shadow-xs'
                        : f === 'remitidas'
                          ? 'border-[var(--secundario)] bg-[var(--secundario)]/15 text-[#1D7A6A] dark:text-[#6ee7b7]'
                          : f === 'en_firma'
                            ? 'border-[var(--acento)] bg-[var(--acento)]/20 text-[#7A5A06] dark:text-[#fcd34d]'
                            : 'border-border bg-muted text-foreground'
                      : 'border-border bg-card/70 text-muted-foreground hover:bg-muted',
                  )}
                >
                  {f === 'remitidas' && <span className="h-2 w-2 rounded-full bg-[var(--secundario)]" />}
                  {f === 'pendientes' && <span className="h-2 w-2 rounded-full bg-muted-foreground/50" />}
                  {f === 'en_firma' && <span className="h-2 w-2 rounded-full bg-[#C9A02A]" />}
                  {f === 'todas'
                    ? 'Todas'
                    : f === 'en_firma'
                      ? 'En revisión y firma'
                      : f === 'remitidas'
                        ? 'Remitidas'
                        : 'Sin remitir'}
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
        <CarpetaAbierta dependencia={abierta} onCerrar={cerrarCarpeta} />
      ) : totales.visibles === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          No se encontraron carpetas que coincidan con los filtros aplicados.
        </Card>
      ) : (
        <div className="space-y-7">
          {porNivel.map((grupo) => {
            const nivelClass = grupo.nivel === 1 ? 'nivel-1' : grupo.nivel === 2 ? 'nivel-2' : 'nivel-3'
            // Distribución adaptativa para eliminar huecos:
            // - Nivel 1 (5 dependencias): 5 columnas en desktop -> 1 fila completa sin huecos.
            // - Nivel 2 (12 dependencias): 4 columnas en desktop (y 3 en tablet, 2 en móvil) -> 3 filas exactas de 4, 0 huecos.
            // - Nivel 3 (47 dependencias): 4 columnas en desktop -> 11 filas completas de 4 + 3 en la última (98% de ocupación).
            const gridClass =
              grupo.nivel === 1
                ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4'
                : 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4'

            return (
              <section key={grupo.nivel} className="space-y-3">
                <div className={cn('nivel-titulo text-xs font-bold uppercase tracking-wider', nivelClass)}>
                  <b>
                    <span>{grupo.nombre}</span>
                    <span className="ml-2 font-mono text-[11px] opacity-75 font-semibold">
                      {grupo.dependencias.length}
                    </span>
                  </b>
                </div>
                <div className={gridClass}>
                  {grupo.dependencias.map((dep) => (
                    <TarjetaCarpeta
                      key={dep.id}
                      dependencia={dep}
                      nivel={grupo.nivel}
                      onAbrir={() => abrirCarpeta(dep)}
                    />
                  ))}
                </div>
              </section>
            )
          })}
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
  nivel,
  onAbrir,
}: {
  dependencia: DependenciaSemaforoItem
  nivel?: number
  onAbrir: () => void
}) {
  const remitida = estaRemitida(dependencia.estado_entrega)
  const enRevision =
    !remitida &&
    (dependencia.estado_entrega === 'en_revision' ||
      estaEnFirma(dependencia.estado_entrega) ||
      dependencia.estado_entrega === 'acta_suscrita')
  const [hover, setHover] = useState(false)

  const nivelNum = nivel ?? dependencia.nivel ?? 3
  const nivelClass = nivelNum === 1 ? 'nivel-1' : nivelNum === 2 ? 'nivel-2' : 'nivel-3'
  const estadoClass = remitida ? 'remitida' : enRevision ? 'revision' : ''
  const tituloCompleto = `[${dependencia.codigo}] ${dependencia.nombre}`

  return (
    <button
      type="button"
      onClick={onAbrir}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      title={tituloCompleto}
      className={cn(
        'tarjeta group relative flex flex-col items-center gap-2 text-center transition-all',
        'hover:-translate-y-1 hover:shadow-md cursor-pointer pt-6 pb-3 px-3',
        nivelClass,
        estadoClass,
      )}
    >
      {/* Indicador de estado discreto: solo punto de 4px y texto en esquina top: 6px; right: 8px */}
      <div className="absolute top-[6px] right-[8px] flex items-center gap-1.5 pointer-events-none">
        <span
          className={cn(
            'h-1 w-1 rounded-full shrink-0',
            remitida
              ? 'bg-[var(--secundario)]'
              : enRevision
                ? 'bg-[#C9A02A]'
                : 'bg-muted-foreground/60',
          )}
        />
        <span
          className={cn(
            'estado text-[10.5px] leading-none whitespace-nowrap',
            remitida
              ? ''
              : enRevision
                ? ''
                : 'text-muted-foreground font-normal',
          )}
        >
          {remitida
            ? 'Remitida'
            : enRevision
              ? 'En revisión y firma'
              : 'En preparación'}
        </span>
      </div>

      {/* Alerta de observaciones si las hay */}
      {dependencia.observaciones > 0 && (
        <span
          className="absolute left-2 top-1.5 inline-flex items-center gap-0.5 rounded-full bg-info-soft px-1.5 py-0.5 text-microdato font-bold text-info-fg"
          title="Observaciones del coordinador"
        >
          <MessageSquareText className="h-3 w-3" />
          {dependencia.observaciones}
        </span>
      )}

      {/* Carpeta SVG con color del nivel o de estado vía currentColor */}
      <div className="carpeta h-20 w-24 drop-shadow-xs transition-transform duration-200">
        <CarpetaSvg tono="custom" abierta={hover} />
      </div>

      {/* Debajo de la carpeta va solo el nombre de la dependencia (sin el código [01]) */}
      <div className="min-w-0 w-full mt-0.5">
        <p
          className="truncate text-xs font-semibold uppercase leading-tight text-foreground"
          title={tituloCompleto}
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
 * lectura) y muestra las observaciones del coordinador como constancia. Es solo
 * consulta: la revisión y la firma se hacen en la sesión del responsable.
 */
function CarpetaAbierta({
  dependencia,
  onCerrar,
}: {
  dependencia: DependenciaSemaforoItem
  onCerrar: () => void
}) {
  const tono = tonoDeCarpeta(dependencia.estado_entrega)
  const remitida = estaRemitida(dependencia.estado_entrega)
  const anexos = anexosDeLaDependencia(dependencia)
  const { data: obsResp } = useObservaciones({ dependencia_id: dependencia.id, estado: 'registrada', per_page: 100 })
  const observaciones = obsResp?.data ?? []

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
              {remitida
                ? 'Entrega remitida'
                : dependencia.estado_entrega === 'acta_suscrita'
                  ? 'Acta suscrita — por remitir'
                  : estaEnFirma(dependencia.estado_entrega)
                    ? 'En revisión y firma'
                    : 'En preparación por el responsable'}
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

                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Observaciones del coordinador: constancia para el acta. */}
      {observaciones.length > 0 && (
        <div className="space-y-2 border-t border-border p-4">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <MessageSquareText className="h-3.5 w-3.5" />
            Observaciones registradas ({observaciones.length})
          </p>
          <ul className="space-y-2">
            {observaciones.map((obs) => (
              <li key={obs.id} className="rounded-lg border bg-card p-3 text-xs">
                <span className="font-semibold text-foreground">
                  {ANEXOS_OBSERVABLES_CONFIG[obs.anexo]?.nombreCorto ?? obs.anexo}
                </span>
                <span className="text-muted-foreground"> · {obs.autor?.name}</span>
                <p className="mt-1 whitespace-pre-wrap text-foreground">{obs.descripcion}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

    </Card>
  )
}
