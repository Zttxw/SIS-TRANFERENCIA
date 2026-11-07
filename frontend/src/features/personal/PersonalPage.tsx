import { useState } from 'react'
import {
  Briefcase,
  Building2,
  Pencil,
  Search,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react'

import { useDependenciaActiva } from '@/auth/hooks'
import { Can } from '@/auth/Can'
import { AlertaBloqueoEntrega } from '@/components/anexos/AlertaBloqueoEntrega'
import { AnexoHeader } from '@/components/anexos/AnexoHeader'
import { ObservacionesAnexoPanel } from '@/components/anexos/ObservacionesAnexoPanel'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { Spinner } from '@/components/ui/spinner'
import { useEstadoEntrega } from '@/features/dashboard/use-dashboard'
import {
  useEliminarPersonal,
  useGuardarPersonal,
  usePersonal,
} from './use-personal'
import { PersonalModal } from './PersonalModal'
import type { GuardarPersonalPayload, Personal } from '@/types/personal'

export function PersonalPage() {
  const { dependenciaId } = useDependenciaActiva()
  const [pagina, setPagina] = useState(1)
  const [busqueda, setBusqueda] = useState('')

  const [modalAbierto, setModalAbierto] = useState(false)
  const [personalAEditar, setPersonalAEditar] = useState<Personal | null>(null)

  const { data: estadoData } = useEstadoEntrega(dependenciaId)
  const { data: paginado, isLoading } = usePersonal({
    dependencia_id: dependenciaId ?? undefined,
    search: busqueda || undefined,
    page: pagina,
    per_page: 15,
  })

  const guardarMut = useGuardarPersonal()
  const eliminarMut = useEliminarPersonal()

  const estadoEntrega = estadoData?.entrega?.estado ?? null
  const esModificable =
    !estadoEntrega || estadoEntrega === 'borrador' || estadoEntrega === 'observada'
  const dependencia = estadoData?.dependencia

  const handleGuardar = (payload: GuardarPersonalPayload) => {
    guardarMut.mutate(payload, {
      onSuccess: () => {
        setModalAbierto(false)
        setPersonalAEditar(null)
      },
    })
  }

  const handleEliminar = (servidor: Personal) => {
    if (confirm(`¿Confirma retirar a ${servidor.nombres} ${servidor.apellidos} del Anexo 05?`)) {
      eliminarMut.mutate(servidor.id)
    }
  }

  if (!dependenciaId) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <AnexoHeader
          numeroAnexo="Anexo 05"
          titulo="Padrón de Personal Asignado"
          subtitulo="Seleccione un centro de costo en la parte superior para consultar el personal a cargo."
        />
        <Card className="border-dashed p-10 text-center">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground/60" />
          <h2 className="mt-4 text-base font-semibold">Selección de Centro de Costo requerida</h2>
          <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
            Utilice el selector de dependencias en la barra superior para gestionar el padrón de servidores asignados.
          </p>
        </Card>
      </div>
    )
  }

  const colaboradores = paginado?.data ?? []
  const meta = paginado?.meta

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <AnexoHeader
        numeroAnexo="Anexo 05"
        titulo="Personal y Colaboradores Asignados a la Unidad"
        subtitulo="Padrón oficial de servidores, regímenes laborales y situación contractual (Directiva N.° 001-2026-MDSJ/A §7.5)"
        dependenciaCodigo={dependencia?.codigo}
        dependenciaNombre={dependencia?.nombre}
        acciones={
          <Can permiso="anexos.registrar">
            <Button
              size="sm"
              className="gap-1.5"
              disabled={!esModificable}
              onClick={() => {
                setPersonalAEditar(null)
                setModalAbierto(true)
              }}
            >
              <UserPlus className="h-4 w-4" />
              Registrar Servidor
            </Button>
          </Can>
        }
      />

      <AlertaBloqueoEntrega estadoEntrega={estadoEntrega} />

      {/* Búsqueda */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar servidor por DNI, nombres, apellidos o cargo..."
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value)
                setPagina(1)
              }}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Personal */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b bg-muted/40 font-medium text-muted-foreground">
              <tr>
                <th className="p-3">DNI</th>
                <th className="p-3">Apellidos y Nombres</th>
                <th className="p-3">Cargo / Función</th>
                <th className="p-3">Régimen Laboral</th>
                <th className="p-3">Modalidad</th>
                <th className="p-3">Situación</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <Spinner className="mx-auto h-6 w-6 text-primary" />
                    <p className="mt-2">Cargando nómina de personal...</p>
                  </td>
                </tr>
              ) : colaboradores.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-muted-foreground">
                    <Users className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                    No se han registrado servidores para esta dependencia.
                  </td>
                </tr>
              ) : (
                colaboradores.map((servidor) => (
                  <tr key={servidor.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-3 font-mono font-medium text-foreground whitespace-nowrap">
                      {servidor.dni}
                    </td>
                    <td className="p-3 font-semibold text-foreground whitespace-nowrap">
                      {servidor.apellidos}, {servidor.nombres}
                    </td>
                    <td className="p-3 text-muted-foreground whitespace-nowrap">
                      <span className="flex items-center gap-1.5">
                        <Briefcase className="h-3.5 w-3.5 text-primary" />
                        {servidor.cargo}
                      </span>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className="inline-flex rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground">
                        {servidor.regimen_laboral}
                      </span>
                    </td>
                    <td className="p-3 whitespace-nowrap text-muted-foreground">
                      {servidor.modalidad_contractual ?? '-'}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                        <UserCheck className="h-3 w-3" />
                        {servidor.situacion_laboral ?? 'ACTIVO'}
                      </span>
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <Can permiso="anexos.registrar">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            disabled={!esModificable}
                            onClick={() => {
                              setPersonalAEditar(servidor)
                              setModalAbierto(true)
                            }}
                            aria-label="Editar servidor"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            disabled={!esModificable || eliminarMut.isPending}
                            onClick={() => handleEliminar(servidor)}
                            aria-label="Eliminar servidor"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </Can>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {meta && (
          <Pagination
            currentPage={meta.current_page}
            lastPage={meta.last_page}
            total={meta.total}
            from={meta.from}
            to={meta.to}
            onPageChange={(p) => setPagina(p)}
            disabled={isLoading}
          />
        )}
      </Card>

      {/* Modal Alta / Edición */}
      <PersonalModal
        open={modalAbierto}
        onClose={() => {
          setModalAbierto(false)
          setPersonalAEditar(null)
        }}
        onSave={handleGuardar}
        personal={personalAEditar}
        dependenciaId={dependenciaId}
        loading={guardarMut.isPending}
      />

      {/* Panel de Observaciones */}
      <ObservacionesAnexoPanel
        anexo="personal"
        observableId={colaboradores[0]?.id}
        dependenciaId={dependenciaId ?? undefined}
        esModificable={esModificable}
      />
    </div>
  )
}
