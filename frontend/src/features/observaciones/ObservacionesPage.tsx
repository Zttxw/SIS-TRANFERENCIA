import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { AlertCircle, Filter, MessageSquareText, RefreshCw, Search } from 'lucide-react'

import { useDependenciaActiva, useModulo } from '@/auth/hooks'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { Spinner } from '@/components/ui/spinner'
import {
  ANEXOS_OBSERVABLES_CONFIG,
  type ClaveAnexoObservable,
  type EstadoObservacion,
  formatearDetalleObservable,
} from '@/types/observaciones'
import { useObservaciones } from './use-observaciones'

/**
 * Consulta de las observaciones que dejaron los coordinadores ETTE (D-07). Son
 * constancia: no se subsanan ni devuelven la entrega. Se registran desde la
 * carpeta del CC en el portal del coordinador y figuran en el Acta 07.
 */
export function ObservacionesPage() {
  const { dependenciaId } = useDependenciaActiva()
  const conDocumentosPendientes = useModulo('documentos_pendientes')

  const [filtroEstado, setFiltroEstado] = useState<EstadoObservacion | 'todos'>('registrada')
  const [filtroAnexo, setFiltroAnexo] = useState<ClaveAnexoObservable | 'todos'>('todos')
  const [busqueda, setBusqueda] = useState('')
  const [pagina, setPagina] = useState(1)
  const [soloMiCentro, setSoloMiCentro] = useState(Boolean(dependenciaId))

  const { data: resp, isLoading, isError, refetch, isFetching } = useObservaciones({
    dependencia_id: soloMiCentro && dependenciaId ? dependenciaId : undefined,
    anexo: filtroAnexo !== 'todos' ? filtroAnexo : undefined,
    estado: filtroEstado !== 'todos' ? filtroEstado : undefined,
    page: pagina,
    per_page: 15,
  })

  const meta = resp?.meta
  const rawList = resp?.data
  const observaciones = useMemo(() => {
    const lista = rawList ?? []
    const q = busqueda.toLowerCase().trim()
    if (!q) return lista
    return lista.filter((obs) =>
      [obs.descripcion, obs.autor?.name ?? '', obs.dependencia?.nombre ?? '', obs.dependencia?.codigo ?? '', formatearDetalleObservable(obs)]
        .some((texto) => texto.toLowerCase().includes(q)),
    )
  }, [rawList, busqueda])

  const hayFiltros = busqueda !== '' || filtroAnexo !== 'todos' || filtroEstado !== 'registrada'

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Observaciones del coordinador ETTE
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Constancias que el coordinador deja al revisar presencialmente la entrega de cada centro de
            costo; el responsable las registra en su sesión. No requieren subsanación: quedan
            registradas en el Acta de Transferencia y el coordinador aprueba con su firma.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-1.5 self-start text-xs">
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      <Card className="border shadow-xs">
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2.5">
            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              Estado:
              <select
                value={filtroEstado}
                onChange={(e) => {
                  setFiltroEstado(e.target.value as EstadoObservacion | 'todos')
                  setPagina(1)
                }}
                className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="registrada">Registradas</option>
                <option value="retirada">Retiradas</option>
                <option value="todos">Todas</option>
              </select>
            </label>

            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              Anexo:
              <select
                value={filtroAnexo}
                onChange={(e) => {
                  setFiltroAnexo(e.target.value as ClaveAnexoObservable | 'todos')
                  setPagina(1)
                }}
                className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="todos">Todos los anexos</option>
                {Object.values(ANEXOS_OBSERVABLES_CONFIG)
                  .filter((cfg) => cfg.clave !== 'documento' || conDocumentosPendientes)
                  .map((cfg) => (
                  <option key={cfg.clave} value={cfg.clave}>
                    {cfg.nombreCorto}
                  </option>
                ))}
              </select>
            </label>

            {dependenciaId && (
              <button
                type="button"
                onClick={() => {
                  setSoloMiCentro(!soloMiCentro)
                  setPagina(1)
                }}
                className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
                  soloMiCentro
                    ? 'border-primary/50 bg-primary/10 font-medium text-primary'
                    : 'border-input bg-background text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <Filter className="h-3 w-3" />
                {soloMiCentro ? 'Solo mi centro de costo' : 'Todo el ámbito'}
              </button>
            )}
          </div>

          <div className="relative w-full lg:w-72">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por texto, CC o autor…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card className="p-12 text-center">
          <Spinner className="mx-auto h-8 w-8 text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">Cargando observaciones…</p>
        </Card>
      ) : isError ? (
        <Card className="border-destructive/30 p-8 text-center text-destructive">
          <AlertCircle className="mx-auto mb-2 h-8 w-8" />
          <p className="text-sm font-semibold">No se pudieron cargar las observaciones</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-4">
            Reintentar
          </Button>
        </Card>
      ) : observaciones.length === 0 ? (
        <Card className="border-dashed p-12 text-center">
          <MessageSquareText className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <h3 className="text-base font-semibold">Sin observaciones</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            {hayFiltros
              ? 'No hay observaciones que coincidan con los filtros.'
              : 'Los coordinadores ETTE no han registrado observaciones en este ámbito.'}
          </p>
          {hayFiltros && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setBusqueda('')
                setFiltroAnexo('todos')
                setFiltroEstado('registrada')
              }}
              className="mt-4 text-xs"
            >
              Restablecer filtros
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {observaciones.map((obs) => {
            const anexo = ANEXOS_OBSERVABLES_CONFIG[obs.anexo]
            const retirada = obs.estado === 'retirada'
            return (
              <Card key={obs.id} className={`border ${retirada ? 'bg-muted/30 opacity-75' : 'bg-card'}`}>
                <CardContent className="space-y-2.5 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {obs.dependencia && (
                        <span className="rounded bg-primary/10 px-2 py-0.5 font-mono font-semibold text-primary">
                          {obs.dependencia.codigo}
                        </span>
                      )}
                      <span className="font-semibold text-foreground">{obs.dependencia?.nombre}</span>
                      <span className="rounded-md border bg-background px-2 py-0.5 font-medium">
                        {anexo?.nombreCorto ?? obs.anexo}
                      </span>
                      <span className="rounded bg-muted px-2 py-0.5 text-muted-foreground">
                        {formatearDetalleObservable(obs)}
                      </span>
                      {retirada && (
                        <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground">
                          Retirada
                        </span>
                      )}
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      {format(new Date(obs.created_at), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}
                      {obs.autor?.name && (
                        <span className="block font-medium text-foreground">
                          {obs.autor.name}
                          {obs.en_calidad_de === 'titular_suplente' ? ' (titular ETTE, suplente)' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm leading-relaxed text-foreground">
                    {obs.descripcion}
                  </p>
                </CardContent>
              </Card>
            )
          })}

          {meta && meta.last_page > 1 && (
            <Pagination
              currentPage={meta.current_page}
              lastPage={meta.last_page}
              total={meta.total}
              from={meta.from}
              to={meta.to}
              onPageChange={setPagina}
            />
          )}
        </div>
      )}
    </div>
  )
}
