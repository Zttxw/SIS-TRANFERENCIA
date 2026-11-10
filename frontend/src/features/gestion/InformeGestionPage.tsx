import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Building2, CheckCircle, Save, User } from 'lucide-react'

import { useDependenciaActiva } from '@/auth/hooks'
import { Can } from '@/auth/Can'
import { AnexoLayout } from '@/components/anexos/AnexoLayout'
import { BotonDescargarPdf } from '@/components/anexos/BotonDescargarPdf'
import { IndicadorFaltantes } from '@/components/anexos/IndicadorFaltantes'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CargaBloque } from '@/components/ui/async-boundary'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useEstadoEntrega } from '@/features/dashboard/use-dashboard'
import { gestionService } from './gestion.service'
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

  // El anexo es siempre editable: el flujo de remisión lo lleva el SGD.
  const esModificable = true

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
      nivel_organizacional: nivel || null,
      cargo_periodo: cargoPeriodo.trim() || null,
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
      <BotonDescargarPdf
        descargar={() => gestionService.descargarPdf(dependenciaId as number)}
        disabled={!dependenciaId}
        etiqueta="PDF oficial"
      />
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
      acciones={acciones}
    >
      {cargando ? (
        <CargaBloque texto="Cargando Informe de Gestión (Anexo 02)…" />
      ) : (
        <>
          {/* Sección I — Identificación del centro de costo */}
          <Card className="bg-muted/15">
            <CardContent className="space-y-4 p-4">
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
                  <span className="text-xs text-muted-foreground">Responsable del Despacho</span>
                  <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <User className="h-4 w-4 shrink-0 text-primary" />
                    <span className="truncate">
                      {informe?.responsable
                        ? `${informe.responsable.nombres} ${informe.responsable.apellidos}`
                        : 'Titular / Encargado de área'}
                    </span>
                  </div>
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
            colorNumero="bg-success-soft text-success-fg"
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
            colorNumero="bg-warning-soft text-warning-fg"
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
            colorNumero="bg-info-soft text-info-fg"
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
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-card p-4 shadow-sm">
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
