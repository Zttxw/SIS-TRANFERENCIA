import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Building2, CheckCircle, Save, User } from 'lucide-react'

import { useDependenciaActiva } from '@/auth/hooks'
import { Can } from '@/auth/Can'
import { AlertaBloqueoEntrega } from '@/components/anexos/AlertaBloqueoEntrega'
import { AnexoHeader } from '@/components/anexos/AnexoHeader'
import { ObservacionesAnexoPanel } from '@/components/anexos/ObservacionesAnexoPanel'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { useEstadoEntrega } from '@/features/dashboard/use-dashboard'
import { useGuardarInformeGestion, useInformeGestion } from './use-gestion'
import { SeccionFilas } from './SeccionFilas'
import type {
  EstadoInformeGestion,
  FilaDificultad,
  FilaFuncion,
  FilaLogro,
  FilaPendiente,
  NivelOrganizacional,
} from '@/types/gestion'

const NIVELES: { valor: NivelOrganizacional; etiqueta: string }[] = [
  { valor: 'primer_nivel', etiqueta: 'Primer nivel' },
  { valor: 'segundo_nivel', etiqueta: 'Segundo nivel' },
  { valor: 'tercer_nivel', etiqueta: 'Tercer nivel' },
  { valor: 'equipo_trabajo', etiqueta: 'Equipo de trabajo' },
]

export function InformeGestionPage() {
  const { dependenciaId } = useDependenciaActiva()
  const { data: estadoData, isLoading: cargandoEstado } = useEstadoEntrega(dependenciaId)
  const { data: informe, isLoading: cargandoInforme } = useInformeGestion(dependenciaId)
  const guardarMut = useGuardarInformeGestion()

  const dependencia = estadoData?.dependencia
  const estadoEntrega = estadoData?.entrega?.estado ?? null
  const esModificable =
    !estadoEntrega || estadoEntrega === 'borrador' || estadoEntrega === 'observada'

  // Estado de cabecera (Sección I) y de las cuatro tablas de filas.
  const [nivel, setNivel] = useState<NivelOrganizacional | ''>('')
  const [cargoPeriodo, setCargoPeriodo] = useState('')
  const [funciones, setFunciones] = useState<FilaFuncion[]>([])
  const [logros, setLogros] = useState<FilaLogro[]>([])
  const [dificultades, setDificultades] = useState<FilaDificultad[]>([])
  const [pendientes, setPendientes] = useState<FilaPendiente[]>([])
  const [mostrarErrores, setMostrarErrores] = useState(false)

  // Sincronizar los datos cargados con el estado del formulario.
  useEffect(() => {
    setNivel((informe?.nivel_organizacional as NivelOrganizacional) ?? '')
    setCargoPeriodo(informe?.cargo_periodo ?? '')
    setFunciones(informe?.funciones ?? [])
    setLogros(informe?.logros_items ?? [])
    setDificultades(informe?.dificultades_items ?? [])
    setPendientes(informe?.pendientes_items ?? [])
    setMostrarErrores(false)
  }, [informe])

  const errorFunciones = useMemo(() => {
    if (!mostrarErrores) return undefined
    if (funciones.length === 0) return 'Registre al menos una función principal.'
    if (funciones.some((f) => !f.descripcion?.trim()))
      return 'Complete la descripción de todas las funciones.'
    return undefined
  }, [funciones, mostrarErrores])

  const errorLogros = useMemo(() => {
    if (!mostrarErrores) return undefined
    if (logros.length === 0) return 'Registre al menos un logro o resultado.'
    if (logros.some((l) => !l.actividad?.trim()))
      return 'Complete la actividad/intervención de todos los logros.'
    return undefined
  }, [logros, mostrarErrores])

  const esValido =
    funciones.length > 0 &&
    funciones.every((f) => f.descripcion?.trim()) &&
    logros.length > 0 &&
    logros.every((l) => l.actividad?.trim())

  const guardar = (estado: EstadoInformeGestion) => {
    if (!dependenciaId) return
    setMostrarErrores(true)
    if (!esValido) return

    // Descartar filas opcionales totalmente vacías antes de enviar.
    const dificultadesLimpias = dificultades.filter((d) => d.dificultad?.trim())
    const pendientesLimpios = pendientes.filter((p) => p.asunto?.trim())

    guardarMut.mutate({
      dependencia_id: dependenciaId,
      nivel_organizacional: nivel || null,
      cargo_periodo: cargoPeriodo.trim() || null,
      funciones,
      logros_items: logros,
      dificultades_items: dificultadesLimpias,
      pendientes_items: pendientesLimpios,
      estado,
    })
  }

  if (!dependenciaId) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <AnexoHeader
          numeroAnexo="Anexo 02"
          titulo="Informe de Gestión por Centro de Costo"
          subtitulo="Seleccione un centro de costo en la parte superior para consultar o registrar la memoria de gestión."
        />
        <Card className="border-dashed p-10 text-center">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground/60" />
          <h2 className="mt-4 text-base font-semibold">Selección de Centro de Costo requerida</h2>
          <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
            Utilice el selector de dependencias en la barra superior para elegir el despacho o centro
            de costo específico y gestionar su Anexo 02.
          </p>
        </Card>
      </div>
    )
  }

  if (cargandoEstado || cargandoInforme) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <Spinner className="h-8 w-8 text-primary" />
        <p className="text-sm text-muted-foreground">Cargando Informe de Gestión (Anexo 02)...</p>
      </div>
    )
  }

  const estadoInformeActual = informe?.estado ?? null

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <AnexoHeader
        numeroAnexo="Anexo 02"
        titulo="Informe de Gestión por Centro de Costo"
        subtitulo="Funciones, logros, dificultades y agenda pendiente por secciones de filas (Directiva N.° 001-2026-MDSJ/A §7.2)"
        dependenciaCodigo={dependencia?.codigo}
        dependenciaNombre={dependencia?.nombre}
        acciones={
          <Can permiso="anexos.registrar">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={!esModificable || guardarMut.isPending}
                onClick={() => guardar('borrador')}
              >
                <Save className="h-4 w-4" />
                Guardar Borrador
              </Button>
              <Button
                type="button"
                size="sm"
                className="gap-1.5 bg-secondary hover:bg-secondary-hover text-white"
                disabled={!esModificable || guardarMut.isPending}
                onClick={() => guardar('completado')}
              >
                <CheckCircle className="h-4 w-4" />
                Marcar Completado
              </Button>
            </div>
          </Can>
        }
      />

      <AlertaBloqueoEntrega estadoEntrega={estadoEntrega} />

      {/* Sección I — Identificación del centro de costo */}
      <Card className="bg-muted/15">
        <CardContent className="space-y-4 p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Centro de Costo / Despacho</span>
              <div className="flex items-center gap-1.5 font-medium text-sm text-foreground">
                <Building2 className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate">{dependencia?.nombre ?? 'Despacho institucional'}</span>
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Responsable del Despacho</span>
              <div className="flex items-center gap-1.5 font-medium text-sm text-foreground">
                <User className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate">
                  {informe?.responsable
                    ? `${informe.responsable.nombres} ${informe.responsable.apellidos}`
                    : 'Titular / Encargado de área'}
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Estado del Informe</span>
              <div>
                {estadoInformeActual === 'completado' ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-semibold text-success-fg">
                    <CheckCircle className="h-3 w-3" />
                    Completado
                  </span>
                ) : estadoInformeActual === 'borrador' ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2.5 py-0.5 text-xs font-semibold text-warning-fg">
                    <Save className="h-3 w-3" />
                    En Borrador
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                    <AlertCircle className="h-3 w-3" />
                    Pendiente de Registro
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Nivel organizacional</Label>
              <div className="flex flex-wrap gap-1.5">
                {NIVELES.map((n) => (
                  <button
                    key={n.valor}
                    type="button"
                    disabled={!esModificable}
                    onClick={() => setNivel(nivel === n.valor ? '' : n.valor)}
                    className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                      nivel === n.valor
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-input text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {n.etiqueta}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cargo_periodo" className="text-xs">
                Cargo / puesto y periodo de gestión
              </Label>
              <Input
                id="cargo_periodo"
                value={cargoPeriodo}
                disabled={!esModificable}
                placeholder="Ej. Jefe de la Unidad de Logística · 2023–2026"
                onChange={(e) => setCargoPeriodo(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sección I — Funciones principales */}
      <SeccionFilas<FilaFuncion>
        numero={1}
        titulo="Principales funciones que desarrolla *"
        descripcion="Atribuciones y actividades sustantivas de la unidad orgánica según el ROF / MOF."
        columnas={[
          {
            campo: 'descripcion',
            titulo: 'Función principal',
            placeholder: 'Describa una función principal del centro de costo',
            multilinea: true,
            requerido: true,
          },
        ]}
        filas={funciones}
        filaVacia={() => ({ descripcion: '' })}
        onChange={setFunciones}
        disabled={!esModificable || guardarMut.isPending}
        etiquetaAgregar="Agregar función"
        error={errorFunciones}
      />

      {/* Sección II — Logros y resultados */}
      <SeccionFilas<FilaLogro>
        numero={2}
        titulo="Logros y resultados obtenidos *"
        descripcion="Actividad o intervención, resultado logrado, indicador/meta y medio de verificación."
        colorNumero="bg-success-soft text-success-fg"
        columnas={[
          { campo: 'actividad', titulo: 'Actividad / intervención', multilinea: true, requerido: true, ancho: 1.2 },
          { campo: 'resultado', titulo: 'Resultado o logro', multilinea: true },
          { campo: 'indicador', titulo: 'Indicador / meta y cumplimiento', multilinea: true },
          { campo: 'verificacion', titulo: 'Medio de verificación', multilinea: true },
        ]}
        filas={logros}
        filaVacia={() => ({ actividad: '', resultado: '', indicador: '', verificacion: '' })}
        onChange={setLogros}
        disabled={!esModificable || guardarMut.isPending}
        etiquetaAgregar="Agregar logro"
        error={errorLogros}
      />

      {/* Sección III — Dificultades afrontadas */}
      <SeccionFilas<FilaDificultad>
        numero={3}
        titulo="Principales dificultades afrontadas"
        descripcion="Dificultad y su causa, efecto en la gestión y medida adoptada o recomendada (opcional)."
        colorNumero="bg-warning-soft text-warning-fg"
        columnas={[
          { campo: 'dificultad', titulo: 'Dificultad y causa', multilinea: true },
          { campo: 'efecto', titulo: 'Efecto / actividad afectada', multilinea: true },
          { campo: 'medida', titulo: 'Medida adoptada o recomendada', multilinea: true },
        ]}
        filas={dificultades}
        filaVacia={() => ({ dificultad: '', efecto: '', medida: '' })}
        onChange={setDificultades}
        disabled={!esModificable || guardarMut.isPending}
        etiquetaAgregar="Agregar dificultad"
      />

      {/* Sección IV — Agenda pendiente */}
      <SeccionFilas<FilaPendiente>
        numero={4}
        titulo="Agenda pendiente y asuntos que requieren atención"
        descripcion="Asuntos en trámite, estado y acción requerida, documento de referencia, plazo y responsable (opcional)."
        colorNumero="bg-purple-500/10 text-purple-700"
        columnas={[
          { campo: 'asunto', titulo: 'Asunto pendiente / descripción', multilinea: true, ancho: 1.3 },
          { campo: 'estado_accion', titulo: 'Estado y acción requerida', multilinea: true },
          { campo: 'documento_referencia', titulo: 'Doc. de referencia / expediente' },
          { campo: 'plazo', titulo: 'Plazo o fecha' },
          { campo: 'responsable', titulo: 'Unidad / responsable' },
        ]}
        filas={pendientes}
        filaVacia={() => ({
          asunto: '',
          estado_accion: '',
          documento_referencia: '',
          plazo: '',
          responsable: '',
        })}
        onChange={setPendientes}
        disabled={!esModificable || guardarMut.isPending}
        etiquetaAgregar="Agregar asunto"
      />

      {/* Barra de acciones inferior */}
      <Can permiso="anexos.registrar">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-card p-4 shadow-sm">
          <div className="text-xs text-muted-foreground">
            {esValido ? (
              <span>Listo para guardar.</span>
            ) : (
              <span className="text-warning-fg font-medium">
                Complete al menos una función y un logro para poder guardar.
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={!esModificable || guardarMut.isPending}
              onClick={() => guardar('borrador')}
            >
              <Save className="mr-1.5 h-4 w-4" />
              Guardar como Borrador
            </Button>
            <Button
              type="button"
              className="bg-secondary hover:bg-secondary-hover text-white"
              disabled={!esModificable || guardarMut.isPending}
              onClick={() => guardar('completado')}
            >
              <CheckCircle className="mr-1.5 h-4 w-4" />
              Completar Anexo 02
            </Button>
          </div>
        </div>
      </Can>

      <ObservacionesAnexoPanel
        anexo="gestion"
        observableId={informe?.id}
        dependenciaId={dependenciaId ?? undefined}
        esModificable={esModificable}
      />
    </div>
  )
}
