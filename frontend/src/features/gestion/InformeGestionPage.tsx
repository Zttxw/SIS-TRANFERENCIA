import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Building2, CheckCircle, Save } from 'lucide-react'

import { useDependenciaActiva } from '@/auth/hooks'
import { Can } from '@/auth/Can'
import { AnexoLayout } from '@/components/anexos/AnexoLayout'
import { UsuarioRegistro } from '@/components/anexos/UsuarioRegistro'
import { IndicadorFaltantes } from '@/components/anexos/IndicadorFaltantes'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CargaBloque } from '@/components/ui/async-boundary'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
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

  const estadoEntrega = estadoData?.entrega?.estado ?? null
  const esModificable =
    !estadoEntrega || estadoEntrega === 'borrador' || estadoEntrega === 'observada'

  // Estado de cabecera (Sección I) y de las cuatro tablas de filas.
  const [nivel, setNivel] = useState<NivelOrganizacional | null>(null)
  const [responsableNombre, setResponsableNombre] = useState('')
  const [cargoResponsable, setCargoResponsable] = useState('')
  const [cargoPeriodo, setCargoPeriodo] = useState('')
  const [funciones, setFunciones] = useState<FilaFuncion[]>([])
  const [logros, setLogros] = useState<FilaLogro[]>([])
  const [dificultades, setDificultades] = useState<FilaDificultad[]>([])
  const [pendientes, setPendientes] = useState<FilaPendiente[]>([])
  const [mostrarErrores, setMostrarErrores] = useState(false)

  // Sincronizar los datos cargados con el estado del formulario.
  useEffect(() => {
    const responsable = informe?.responsable ?? informe?.cabecera?.responsable
    const cargo = informe?.cargo_responsable ?? informe?.cabecera?.cargo ?? ''
    setResponsableNombre(informe?.responsable_nombre ?? (responsable ? `${responsable.nombres} ${responsable.apellidos}`.trim() : ''))
    setCargoResponsable(cargo)
    setNivel(informe?.nivel_organizacional ?? informe?.cabecera?.nivel_organizacional ?? null)
    const guardado = informe?.cargo_periodo ?? ''
    setCargoPeriodo(informe?.periodo_gestion ?? (guardado === cargo ? '' : guardado.startsWith(`${cargo} · `) ? guardado.slice(cargo.length + 3) : guardado))
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

  // Requisitos pendientes para habilitar el guardado (indicador «faltan: X»).
  const faltantes = useMemo(() => {
    const items: string[] = []
    if (!(funciones.length > 0 && funciones.every((f) => f.descripcion?.trim())))
      items.push('una función principal')
    if (!(logros.length > 0 && logros.every((l) => l.actividad?.trim())))
      items.push('un logro con actividad')
    return items
  }, [funciones, logros])

  const esValido = faltantes.length === 0

  const guardar = (estado: EstadoInformeGestion) => {
    if (!dependenciaId) return
    setMostrarErrores(true)
    if (!esValido) return

    // Descartar filas opcionales totalmente vacías antes de enviar.
    const dificultadesLimpias = dificultades.filter((d) => d.dificultad?.trim())
    const pendientesLimpios = pendientes.filter((p) => p.asunto?.trim())

    guardarMut.mutate({
      dependencia_id: dependenciaId,
      responsable_nombre: responsableNombre.trim() || null,
      cargo_responsable: cargoResponsable.trim() || null,
      nivel_organizacional: nivel,
      periodo_gestion: cargoPeriodo.trim() || null,
      funciones,
      logros_items: logros,
      dificultades_items: dificultadesLimpias,
      pendientes_items: pendientesLimpios,
      estado,
    })
  }

  const cargando = Boolean(dependenciaId) && (cargandoEstado || cargandoInforme)

  const acciones = (
    <>
      <Can permiso="anexos.registrar">
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
      </Can>
    </>
  )

  return (
    <AnexoLayout
      numeroAnexo="Anexo 02"
      tituloCorto="Informe de Gestión por Centro de Costo"
      titulo="Informe de Gestión por Centro de Costo"
      subtitulo="Funciones, logros, dificultades y agenda pendiente por secciones de filas (Directiva N.° 001-2026-MDSJ/A §7.2)"
      guiaSeleccion="Utilice el selector de dependencias en la barra superior para elegir el despacho o centro de costo y gestionar su Anexo 02."
      dependenciaId={dependenciaId}
      dependencia={estadoData?.dependencia}
      estadoEntrega={estadoEntrega}
      esModificable={esModificable}
      acciones={acciones}
      anexoObservable="gestion"
      observableId={informe?.id}
    >
      {cargando ? (
        <CargaBloque texto="Cargando Informe de Gestión (Anexo 02)…" />
      ) : (
        <>
          {/* Sección I — Identificación del centro de costo */}
          <Card className="relative z-10 overflow-visible border-primary/20 shadow-sm">
            <div className="rounded-t-xl border-b border-primary/15 bg-primary/5 px-5 py-4">
              <h2 className="flex items-center gap-2 font-semibold text-primary"><Building2 className="h-5 w-5" /> Identificación del responsable</h2>
              <p className="mt-1 text-xs text-muted-foreground">Datos precargados. Puede corregirlos para este informe.</p>
            </div>
            <CardContent className="space-y-4 p-4">
              {informe?.id && (
                <div className="print:hidden">
                  <p className="mb-1 text-xs text-muted-foreground">Último guardado por</p>
                  <UsuarioRegistro usuario={informe.elaborado_por} fecha={informe.updated_at} />
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Centro de Costo / Despacho</span>
                  <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <Building2 className="h-4 w-4 shrink-0 text-primary" />
                    <span className="truncate">
                      {estadoData?.dependencia?.nombre ?? 'Despacho institucional'}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="responsable_nombre" className="text-xs">Responsable del despacho</Label>
                  <Input
                    id="responsable_nombre"
                    value={responsableNombre}
                    onChange={(e) => setResponsableNombre(e.target.value)}
                    disabled={!esModificable || guardarMut.isPending}
                    maxLength={255}
                    placeholder="Nombres y apellidos"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Estado del Informe (Anexo 02)</span>
                  <div>
                    {informe?.estado === 'completado' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-semibold text-success-fg">
                        <CheckCircle className="h-3 w-3" />
                        Completado
                      </span>
                    ) : informe?.estado === 'borrador' ? (
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

              <div className="space-y-1.5">
                <Label htmlFor="cargo_responsable" className="text-xs">Cargo / puesto del responsable</Label>
                <Input
                  id="cargo_responsable"
                  value={cargoResponsable}
                  onChange={(e) => setCargoResponsable(e.target.value)}
                  disabled={!esModificable || guardarMut.isPending}
                  maxLength={255}
                  placeholder="Cargo o puesto"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="nivel_organizacional" className="text-xs">Nivel organizacional</Label>
                  <Select<NivelOrganizacional>
                    id="nivel_organizacional"
                    options={NIVELES.map((n) => ({ value: n.valor, label: n.etiqueta }))}
                    value={nivel}
                    onChange={setNivel}
                    disabled={!esModificable || guardarMut.isPending}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cargo_periodo" className="text-xs">
                    Periodo de gestión
                  </Label>
                  <Input
                    id="cargo_periodo"
                    value={cargoPeriodo}
                    disabled={!esModificable}
                    placeholder="Ej. enero de 2025 a diciembre de 2026"
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
            hint="Transcriba cada función tal como aparece en el ROF o MOF. Una fila por función; use «Agregar función» para las demás."
            columnas={[
              {
                campo: 'descripcion',
                titulo: 'Función principal',
                placeholder: 'Ej. Formular y supervisar el Plan Operativo Institucional del área',
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
            hint="Para cada logro, enlace la actividad con su resultado medible y el documento que lo sustenta (acta, informe, oficio)."
            colorNumero="bg-emerald-600 text-white"
            columnas={[
              { campo: 'actividad', titulo: 'Actividad / intervención', placeholder: 'Ej. Digitalización del archivo 2023', multilinea: true, requerido: true, ancho: 1.2 },
              { campo: 'resultado', titulo: 'Resultado o logro', placeholder: 'Ej. 1 200 expedientes digitalizados', multilinea: true },
              { campo: 'indicador', titulo: 'Indicador / meta y cumplimiento', placeholder: 'Ej. 95 % de la meta anual', multilinea: true },
              { campo: 'verificacion', titulo: 'Medio de verificación', placeholder: 'Ej. Informe N.° 045-2026', multilinea: true },
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
            hint="Opcional. Registre solo las dificultades relevantes para la continuidad de la gestión que recibe el sucesor."
            colorNumero="bg-amber-400 text-slate-950"
            columnas={[
              { campo: 'dificultad', titulo: 'Dificultad y causa', placeholder: 'Ej. Falta de personal CAS por recorte presupuestal', multilinea: true },
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
            hint="Lo que el sucesor debe atender de inmediato: trámites abiertos, plazos por vencer y expedientes en curso."
            colorNumero="bg-blue-600 text-white"
            columnas={[
              { campo: 'asunto', titulo: 'Asunto pendiente / descripción', placeholder: 'Ej. Contrato de servicio de limpieza por renovar', multilinea: true, ancho: 1.3 },
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
            <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-primary/20 bg-card p-4 shadow-lg">
              <IndicadorFaltantes
                faltantes={faltantes}
                textoCompleto="Listo para guardar o marcar completado."
              />
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
        </>
      )}
    </AnexoLayout>
  )
}
