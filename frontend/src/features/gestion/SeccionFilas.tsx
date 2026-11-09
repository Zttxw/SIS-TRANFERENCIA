import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { EditableTable, type ColumnaEditable, type FilaEditable } from '@/components/ui/editable-table'

/** Columna de una sección del Anexo 02 (adaptador sobre `ColumnaEditable`). */
export interface ColumnaFila {
  campo: string
  titulo: string
  placeholder?: string
  multilinea?: boolean
  ancho?: number
  requerido?: boolean
}

interface SeccionFilasProps<T extends FilaEditable> {
  numero: number
  titulo: string
  descripcion?: string
  colorNumero?: string
  columnas: ColumnaFila[]
  filas: T[]
  filaVacia: () => T
  onChange: (filas: T[]) => void
  disabled?: boolean
  etiquetaAgregar?: string
  error?: string
}

/**
 * Sección numerada del Informe de Gestión (Anexo 02). Envuelve la primitiva
 * genérica `EditableTable` con la cabecera de sección (número + título). La
 * lógica de filas vive en la primitiva (F1); aquí solo se compone la tarjeta.
 */
export function SeccionFilas<T extends FilaEditable>({
  numero,
  titulo,
  descripcion,
  colorNumero = 'bg-primary/10 text-primary',
  columnas,
  filas,
  filaVacia,
  onChange,
  disabled = false,
  etiquetaAgregar = 'Agregar fila',
  error,
}: SeccionFilasProps<T>) {
  const columnasEditables: ColumnaEditable<T>[] = columnas.map((c) => ({
    campo: c.campo as keyof T & string,
    titulo: c.titulo,
    placeholder: c.placeholder,
    tipo: c.multilinea ? 'textarea' : 'texto',
    ancho: c.ancho,
    requerido: c.requerido,
  }))

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded font-bold text-xs ${colorNumero}`}
          >
            {numero}
          </div>
          <div>
            <CardTitle className="text-base">{titulo}</CardTitle>
            {descripcion ? (
              <CardDescription className="text-xs">{descripcion}</CardDescription>
            ) : null}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <EditableTable
          columnas={columnasEditables}
          filas={filas}
          filaVacia={filaVacia}
          onChange={onChange}
          disabled={disabled}
          etiquetaAgregar={etiquetaAgregar}
          error={error}
        />
      </CardContent>
    </Card>
  )
}
