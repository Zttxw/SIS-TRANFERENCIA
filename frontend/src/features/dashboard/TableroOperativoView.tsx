import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Package,
  RefreshCw,
  Search,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { useTableroOperativo } from './use-dashboard'

interface TableroOperativoViewProps {
  onSeleccionarDependencia: (id: number) => void
}

/** Clases de color para la barra de anexos completos (0–5). */
function colorAvance(completos: number): string {
  if (completos >= 5) return 'bg-success'
  if (completos >= 3) return 'bg-info'
  if (completos >= 1) return 'bg-warning'
  return 'bg-muted-foreground/40'
}

/**
 * Tablero de avance institucional: una fila por centro de costo con cuántos
 * anexos (02–06) tiene completos y el % de verificación patrimonial. Visión de
 * apoyo para quien da seguimiento (admin / ETTS); no refleja el flujo de
 * remisión, que lo lleva el SGD.
 */
export function TableroOperativoView({ onSeleccionarDependencia }: TableroOperativoViewProps) {
  const { data: tablero, isLoading, error, refetch, isFetching } = useTableroOperativo()

  const [busqueda, setBusqueda] = useState('')
  const [filtroNivel, setFiltroNivel] = useState<number | 'todos'>('todos')

  const dependenciasLista = tablero?.dependencias
  const dependenciasFiltradas = useMemo(() => {
    if (!dependenciasLista) return []

    return dependenciasLista.filter((dep) => {
      const texto = busqueda.toLowerCase().trim()
      const coincideTexto =
        texto === '' ||
        dep.codigo.toLowerCase().includes(texto) ||
        dep.nombre.toLowerCase().includes(texto) ||
        (dep.encargado?.nombres || '').toLowerCase().includes(texto) ||
        (dep.encargado?.apellidos || '').toLowerCase().includes(texto)

      const coincideNivel = filtroNivel === 'todos' || dep.nivel === filtroNivel

      return coincideTexto && coincideNivel
    })
  }, [dependenciasLista, busqueda, filtroNivel])

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    )
  }

  if (error || !tablero) {
    return (
      <Card className="border-destructive/40 bg-destructive/5 p-8 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-destructive" />
        <h2 className="mt-3 text-lg font-semibold text-destructive">
          No se pudo cargar el tablero de avance
        </h2>
        <Button variant="outline" className="mt-4" onClick={() => refetch()}>
          <RefreshCw className="mr-1.5 h-4 w-4" />
          Reintentar
        </Button>
      </Card>
    )
  }

  const { metricas } = tablero

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Avance institucional de los anexos
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Seguimiento del llenado de los anexos (02–06) y de la verificación
            patrimonial por centro de costo.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`mr-1.5 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="p-4 pb-1">
            <span className="text-xs font-medium text-muted-foreground">Centros de costo</span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-foreground">
              {metricas.total_dependencias}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-1">
            <span className="text-xs font-medium text-muted-foreground">Bienes SIGA</span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-foreground">
              {metricas.patrimonio.total_bienes}
            </div>
            <p className="text-nota text-muted-foreground">
              {metricas.patrimonio.verificados} verificados · {metricas.patrimonio.pendientes} pendientes
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-1">
            <span className="text-xs font-medium text-muted-foreground">Verificación patrimonial</span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-foreground">
              {metricas.patrimonio.porcentaje}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código, centro de costo o encargado..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-1.5">
              {(['todos', 1, 2, 3] as const).map((n) => (
                <Button
                  key={n}
                  type="button"
                  variant={filtroNivel === n ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-8 px-2.5"
                  onClick={() => setFiltroNivel(n)}
                >
                  {n === 'todos' ? 'Todos' : `Nivel ${n}`}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de avance */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b bg-muted/40 font-medium text-muted-foreground">
              <tr>
                <th className="p-3">Centro de costo</th>
                <th className="p-3">Encargado</th>
                <th className="p-3">Anexos completos</th>
                <th className="p-3">Patrimonio</th>
                <th className="p-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {dependenciasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-muted-foreground">
                    <Building2 className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                    No hay centros de costo que coincidan con el filtro.
                  </td>
                </tr>
              ) : (
                dependenciasFiltradas.map((dep) => (
                  <tr key={dep.id} className="hover:bg-muted/20">
                    <td className="p-3">
                      <span className="font-mono font-semibold text-primary">[{dep.codigo}]</span>
                      <p className="font-medium text-foreground">{dep.nombre}</p>
                      <span className="text-nota text-muted-foreground">Nivel {dep.nivel}</span>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {dep.encargado
                        ? `${dep.encargado.apellidos}, ${dep.encargado.nombres}`
                        : <span className="italic text-muted-foreground/60">Sin encargado</span>}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-secondary">
                          <div
                            className={`h-full ${colorAvance(dep.anexos_completos)} transition-all`}
                            style={{ width: `${(dep.anexos_completos / 5) * 100}%` }}
                          />
                        </div>
                        <span className="font-mono font-semibold text-foreground">
                          {dep.anexos_completos}/5
                        </span>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Package className="h-3.5 w-3.5" />
                        {dep.patrimonio_confirmados}/{dep.patrimonio_total} ({dep.patrimonio_porcentaje}%)
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1 text-xs"
                        onClick={() => onSeleccionarDependencia(dep.id)}
                      >
                        Ver anexos
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
