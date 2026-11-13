import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'

import { Can } from '@/auth/Can'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { DataTable, type ColumnaTabla } from '@/components/ui/data-table'
import { Input } from '@/components/ui/input'
import type { Permiso } from '@/auth/permisos'
import type { PaginationMeta } from '@/types/api'
import type { ClaveAnexoObservable } from '@/types/observaciones'
import type { EstadoEntrega } from '@/types/transferencia'
import { AnexoLayout, type DependenciaResumenAnexo } from './AnexoLayout'

/** Props del modal de alta/edición que renderiza el patrón. */
export interface RenderModalArgs<T> {
  open: boolean
  onClose: () => void
  /** Registro a editar, o `null` en modo alta. */
  registro: T | null
}

interface AnexoCrudPageProps<T> {
  // ── Identidad del anexo (delegado a AnexoLayout) ──────────────────────────
  numeroAnexo: string
  tituloCorto: string
  titulo: string
  subtitulo?: string
  guiaSeleccion?: string
  anexoObservable?: ClaveAnexoObservable

  // ── Contexto de dependencia / entrega ─────────────────────────────────────
  dependenciaId: number | null
  dependencia?: DependenciaResumenAnexo
  estadoEntrega?: EstadoEntrega | null
  esModificable?: boolean

  // ── Datos ─────────────────────────────────────────────────────────────────
  filas: T[] | undefined
  rowKey: (fila: T) => string | number
  loading?: boolean
  error?: unknown
  onReintentar?: () => void
  meta?: PaginationMeta
  onPageChange?: (page: number) => void

  // ── Tabla ─────────────────────────────────────────────────────────────────
  /** Columnas de datos; la columna de acciones se añade automáticamente. */
  columnas: ColumnaTabla<T>[]
  /** Oculta la columna de acciones (anexos de solo verificación). */
  sinAcciones?: boolean

  // ── Búsqueda / filtros ─────────────────────────────────────────────────────
  busqueda: string
  onBuscar: (valor: string) => void
  placeholderBusqueda?: string
  /** Controles de filtro extra a la derecha del buscador (p. ej. un Select). */
  filtrosExtra?: React.ReactNode

  // ── Acción primaria (alta) ─────────────────────────────────────────────────
  permiso?: Permiso
  textoNuevo: string
  iconoNuevo?: LucideIcon
  vacio: { icono?: LucideIcon; titulo: string; descripcion?: string }
  /**
   * Acciones extra en la cabecera, a la izquierda del botón de alta y fuera del
   * `<Can>` de registro (p. ej. «Descargar PDF», visible para quien solo consulta).
   */
  accionesExtra?: React.ReactNode
  aviso?: React.ReactNode

  // ── Eliminación ────────────────────────────────────────────────────────────
  /** Texto de confirmación por fila; omitir deshabilita el botón eliminar. */
  confirmarEliminar?: (fila: T) => { title: string; description?: string }
  onEliminar?: (fila: T) => void
  eliminando?: boolean

  // ── Modal ──────────────────────────────────────────────────────────────────
  renderModal: (args: RenderModalArgs<T>) => React.ReactNode

  // ── Vista alternativa ──────────────────────────────────────────────────────
  /**
   * Si se pasa, reemplaza el cuerpo de tabla (`DataTable`) por lo que devuelva,
   * conservando todo el marco (header, chip, alerta, filtros, modal,
   * observaciones). Recibe los handlers del modal (`abrirAlta`/`abrirEdicion`)
   * para que la vista pueda disparar la misma edición. Habilita vistas distintas
   * a la lista plana —p. ej. el acervo agrupado por año o el patrimonio por
   * servidor— sin salir del patrón.
   */
  vistaAlternativa?: (handlers: {
    abrirAlta: () => void
    abrirEdicion: (fila: T) => void
  }) => React.ReactNode
}

/**
 * Patrón declarativo para los anexos de listado (03, 05, 06, documentos…).
 * Recibe columnas, filtros, datos y el modal; aplica por sí mismo:
 *  - el marco de anexo (`AnexoLayout`: header, chip, alerta de bloqueo, panel),
 *  - el bloqueo por estado de entrega (`esModificable` → botones deshabilitados),
 *  - permisos (`<Can>`), estados vacío/carga/error (`DataTable`),
 *  - la confirmación suave de borrado (`useConfirm`, no `confirm()` nativo).
 *
 * Las páginas pasan a ser configuración: mejorar la UX = tocar este archivo.
 */
export function AnexoCrudPage<T>({
  numeroAnexo,
  tituloCorto,
  titulo,
  subtitulo,
  guiaSeleccion,
  anexoObservable,
  dependenciaId,
  dependencia,
  estadoEntrega,
  esModificable = true,
  filas,
  rowKey,
  loading,
  error,
  onReintentar,
  meta,
  onPageChange,
  columnas,
  sinAcciones = false,
  busqueda,
  onBuscar,
  placeholderBusqueda = 'Buscar…',
  filtrosExtra,
  permiso = 'anexos.registrar',
  textoNuevo,
  iconoNuevo: IconoNuevo = Plus,
  vacio,
  accionesExtra,
  aviso,
  confirmarEliminar,
  onEliminar,
  eliminando = false,
  renderModal,
  vistaAlternativa,
}: AnexoCrudPageProps<T>) {
  const confirmar = useConfirm()
  const [modalAbierto, setModalAbierto] = useState(false)
  const [registroEnEdicion, setRegistroEnEdicion] = useState<T | null>(null)

  const abrirAlta = () => {
    setRegistroEnEdicion(null)
    setModalAbierto(true)
  }
  const abrirEdicion = (fila: T) => {
    setRegistroEnEdicion(fila)
    setModalAbierto(true)
  }
  const cerrarModal = () => {
    setModalAbierto(false)
    setRegistroEnEdicion(null)
  }

  const solicitarEliminar = async (fila: T) => {
    if (!confirmarEliminar || !onEliminar) return
    const ok = await confirmar({ ...confirmarEliminar(fila), variant: 'destructive', confirmText: 'Eliminar' })
    if (ok) onEliminar(fila)
  }

  const columnasConAcciones: ColumnaTabla<T>[] = sinAcciones
    ? columnas
    : [
        ...columnas,
        {
          id: '__acciones',
          header: 'Acciones',
          align: 'right',
          className: 'whitespace-nowrap',
          cell: (fila) => (
            <Can permiso={permiso}>
              <div className="flex items-center justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  disabled={!esModificable}
                  onClick={() => abrirEdicion(fila)}
                  aria-label="Editar registro"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                {confirmarEliminar && onEliminar && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    disabled={!esModificable || eliminando}
                    onClick={() => solicitarEliminar(fila)}
                    aria-label="Eliminar registro"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </Can>
          ),
        },
      ]

  return (
    <AnexoLayout
      numeroAnexo={numeroAnexo}
      tituloCorto={tituloCorto}
      titulo={titulo}
      subtitulo={subtitulo}
      guiaSeleccion={guiaSeleccion}
      dependenciaId={dependenciaId}
      dependencia={dependencia}
      estadoEntrega={estadoEntrega}
      esModificable={esModificable}
      anexoObservable={anexoObservable}
      observableId={filas?.[0] ? Number(rowKey(filas[0])) : undefined}
      acciones={
        <>
          {accionesExtra}
          <Can permiso={permiso}>
            <Button size="sm" className="gap-1.5" disabled={!esModificable} onClick={abrirAlta}>
              <IconoNuevo className="h-4 w-4" />
              {textoNuevo}
            </Button>
          </Can>
        </>
      }
    >
      {/* Barra de búsqueda + filtros */}
      {aviso}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={placeholderBusqueda}
                value={busqueda}
                onChange={(e) => onBuscar(e.target.value)}
                className="pl-9"
              />
            </div>
            {filtrosExtra && <div className="flex flex-wrap items-center gap-2">{filtrosExtra}</div>}
          </div>
        </CardContent>
      </Card>

      {/* Cuerpo: vista alternativa (si se pasa) o la tabla por defecto */}
      {vistaAlternativa ? (
        vistaAlternativa({ abrirAlta, abrirEdicion })
      ) : (
        <DataTable
          columnas={columnasConAcciones}
          filas={filas}
          rowKey={rowKey}
          loading={loading}
          error={error}
          onReintentar={onReintentar}
          meta={meta}
          onPageChange={onPageChange}
          vacio={{
            titulo: vacio.titulo,
            descripcion: vacio.descripcion,
            accion: (
              <Can permiso={permiso}>
                <Button size="sm" className="gap-1.5" disabled={!esModificable} onClick={abrirAlta}>
                  <IconoNuevo className="h-4 w-4" />
                  {textoNuevo}
                </Button>
              </Can>
            ),
          }}
        />
      )}

      {renderModal({ open: modalAbierto, onClose: cerrarModal, registro: registroEnEdicion })}
    </AnexoLayout>
  )
}
