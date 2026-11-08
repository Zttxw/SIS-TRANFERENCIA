import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Archive,
  ArrowRight,
  Boxes,
  Building2,
  Package,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-react'

import { useAuth, useDependenciaActiva } from '@/auth/hooks'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { useEstadoEntrega } from '@/features/dashboard/use-dashboard'
import type { Servidor } from '@/types/auth'

import { obtenerDependencia } from './dependencias.service'

/**
 * Vista de Despacho Operativo y Personal Asignado.
 * Diseñada específicamente para Jefes de Dependencia (ej. Jefe de OTI) y Servidores Públicos.
 * Muestra el equipo de trabajo de la oficina, estado operativo, bienes en custodia y anexos.
 */
export function DespachoPersonalView() {
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const { dependenciaId } = useDependenciaActiva()

  const idEfectivo = dependenciaId ?? usuario?.servidor?.dependencia_id ?? null

  const { data: dep, isLoading: depCargando } = useQuery({
    queryKey: ['dependencia', 'detalle', idEfectivo],
    queryFn: () => obtenerDependencia(idEfectivo!),
    enabled: Boolean(idEfectivo),
    staleTime: 60_000,
  })

  const { data: estadoData, isLoading: estadoCargando } = useEstadoEntrega(idEfectivo)

  const [busqueda, setBusqueda] = useState('')
  const servidores = dep?.servidores

  const servidoresFiltrados = useMemo(() => {
    if (!servidores) return []
    if (!busqueda.trim()) return servidores

    const q = busqueda.toLowerCase().trim()
    return servidores.filter(
      (s) =>
        s.dni.includes(q) ||
        s.nombres.toLowerCase().includes(q) ||
        s.apellidos.toLowerCase().includes(q) ||
        (s.cargo && s.cargo.toLowerCase().includes(q)),
    )
  }, [servidores, busqueda])

  if (depCargando || estadoCargando) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
        <Spinner className="h-8 w-8 text-[#3484A5]" />
        <p className="text-xs text-muted-foreground font-medium">
          Cargando información del despacho y trabajadores...
        </p>
      </div>
    )
  }

  if (!dep) {
    return (
      <Card className="border-destructive/30 p-8 text-center bg-destructive/5">
        <p className="font-semibold text-sm text-foreground">
          No se encontró la información del despacho asignado.
        </p>
      </Card>
    )
  }

  const esJefe =
    Boolean(usuario?.servidor?.es_responsable) ||
    Boolean(usuario?.roles?.some((r) => r.rol === 'responsable_centro_costo'))

  return (
    <div className="space-y-6">
      {/* ========================================================
          CABECERA INSTITUCIONAL DEL DESPACHO
          ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-[#3484A5] bg-[#3484A5]/10 px-2.5 py-0.5 rounded">
              Anexo 01
            </span>
            <span className="font-mono text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded">
              [{dep.codigo}]
            </span>
            <Badge
              variant="outline"
              className="text-xs font-semibold border-[#2CA792]/40 bg-[#2CA792]/10 text-[#2CA792]"
            >
              Nivel Operativo {dep.nivel}
            </Badge>
            {esJefe && (
              <Badge
                variant="outline"
                className="text-xs font-bold border-[#3484A5]/40 bg-[#3484A5]/15 text-[#3484A5]"
              >
                <UserCheck className="mr-1 h-3.5 w-3.5" />
                Su Despacho a Cargo
              </Badge>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1.5 uppercase">
            {dep.nombre}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Personal operativo, distribución de bienes y avance del proceso de transferencia
          </p>
        </div>

        {/* Acciones principales */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => navigate('/')}
            className="h-8 text-xs gap-1.5 bg-[#3484A5] hover:bg-[#2b718d] text-white shadow-xs cursor-pointer"
          >
            <Boxes className="h-3.5 w-3.5" />
            <span>Ver Tablero de Entrega</span>
          </Button>
        </div>
      </div>

      {/* ========================================================
          TARJETAS KPI RESUMEN DE LA OFICINA
          ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Trabajadores Asignados */}
        <Card className="border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Trabajadores Asignados
              </p>
              <p className="text-2xl font-bold font-mono text-[#3484A5] mt-1">
                {dep.servidores?.length ?? 0}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Padrón operativo del centro de costo
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-[#3484A5]/10 flex items-center justify-center text-[#3484A5]">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* KPI 2: Bienes SIGA en Custodia */}
        <Card className="border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Bienes Patrimoniales (SIGA)
              </p>
              <p className="text-2xl font-bold font-mono text-emerald-600 mt-1">
                {estadoData?.anexo04_patrimonio?.total_bienes ?? 0}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {estadoData?.anexo04_patrimonio?.confirmados ?? 0} verificados en Anexo 04
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <Package className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* KPI 3: Acervo Documental */}
        <Card className="border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Acervo Documentario
              </p>
              <p className="text-2xl font-bold font-mono text-indigo-600 mt-1">
                {estadoData?.anexo03_acervo?.total_series ?? 0}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Series documentales inventariadas
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
              <Archive className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* KPI 4: Estado de la Entrega */}
        <Card className="border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Estado de Entrega
              </p>
              <p className="text-base font-bold text-slate-800 capitalize mt-1.5 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-[#2CA792]" />
                {estadoData?.entrega?.estado ?? 'Borrador'}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Destino: {dep.parent_id ? 'Superior Jerárquico' : 'ETTS Institucional'}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
              <Building2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ========================================================
          PADRÓN DE TRABAJADORES DE LA OFICINA
          ======================================================== */}
      <Card className="border shadow-xs">
        <CardHeader className="py-4 px-5 border-b border-border bg-slate-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Users className="h-4 w-4 text-[#3484A5]" />
                <span>Trabajadores y Personal del Despacho ({servidoresFiltrados.length})</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Servidores públicos asignados por estructura orgánica a este centro de costo
              </CardDescription>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por DNI, nombres o cargo..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-8 text-xs h-8 bg-white"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          {servidoresFiltrados.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No se encontraron trabajadores en este despacho con el filtro aplicado.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="py-2.5 px-4">DNI</th>
                  <th className="py-2.5 px-4">Servidor Público</th>
                  <th className="py-2.5 px-4">Cargo Oficial</th>
                  <th className="py-2.5 px-4">Condición</th>
                  <th className="py-2.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {servidoresFiltrados.map((s: Servidor) => {
                  const esResponsable = s.es_responsable || dep.encargado?.id === s.id
                  return (
                    <tr
                      key={s.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        esResponsable ? 'bg-[#3484A5]/5' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-semibold text-[#3484A5]">
                        {s.dni}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800 uppercase">
                        {s.apellidos}, {s.nombres}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {s.cargo || 'Servidor Público Asignado'}
                      </td>
                      <td className="py-3 px-4">
                        {esResponsable ? (
                          <Badge
                            variant="outline"
                            className="border-[#2CA792]/40 bg-[#2CA792]/15 text-[#2CA792] font-bold text-[10px] uppercase"
                          >
                            <UserCheck className="mr-1 h-3 w-3" />
                            Jefatura de Despacho
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-slate-200 bg-slate-50 text-slate-600 font-medium text-[10px] uppercase"
                          >
                            Servidor
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate('/patrimonio')}
                          className="h-7 text-xs text-[#3484A5] hover:bg-[#3484A5]/10 gap-1 font-medium"
                        >
                          <span>Bienes en custodia</span>
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* ========================================================
          ACCESOS DIRECTOS A LOS ANEXOS DE TRANSFERENCIA
          ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Anexo 04 */}
        <Card
          onClick={() => navigate('/patrimonio')}
          className="border shadow-xs hover:border-[#3484A5]/50 transition-all cursor-pointer group"
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#3484A5]/10 flex items-center justify-center text-[#3484A5] group-hover:bg-[#3484A5] group-hover:text-white transition-colors">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Anexo 04 · Patrimonio</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Verificar {estadoData?.anexo04_patrimonio?.total_bienes ?? 0} bienes en custodia
                </p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-[#3484A5] transition-colors" />
          </CardContent>
        </Card>

        {/* Anexo 05 */}
        <Card
          onClick={() => navigate('/personal')}
          className="border shadow-xs hover:border-[#3484A5]/50 transition-all cursor-pointer group"
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Anexo 05 · Personal Asignado</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Padrón de servidores y situación contractual
                </p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-teal-600 transition-colors" />
          </CardContent>
        </Card>

        {/* Anexo 03 */}
        <Card
          onClick={() => navigate('/acervo')}
          className="border shadow-xs hover:border-[#3484A5]/50 transition-all cursor-pointer group"
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Archive className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Anexo 03 · Acervo Documentario</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Inventario físico de archivadores y cajas
                </p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-indigo-600 transition-colors" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
