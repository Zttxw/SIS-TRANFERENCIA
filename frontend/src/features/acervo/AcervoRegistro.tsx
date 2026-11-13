import { Fragment, useState } from 'react'
import { ChevronDown, FolderArchive, HardDrive, Pencil, Trash2 } from 'lucide-react'

import { Can } from '@/auth/Can'
import { UsuarioRegistro } from '@/components/anexos/UsuarioRegistro'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { rangoAniosAcervo } from './agrupar-por-anio'
import type { AcervoDocumental } from '@/types/acervo'

interface Props {
  registro: AcervoDocumental
  esModificable: boolean
  eliminando?: boolean
  onEditar: (registro: AcervoDocumental) => void
  onEliminar: (registro: AcervoDocumental) => void
}

export function AcervoCabecera() {
  return (
    <thead className="border-b bg-muted/40 text-left text-xs font-medium text-muted-foreground">
      <tr>
        <th className="p-3">Serie documental</th>
        <th className="hidden w-20 p-3 sm:table-cell">Periodo</th>
        <th className="w-16 p-3 sm:w-32">Cantidad</th>
        <th className="hidden w-[20%] p-3 lg:table-cell">Ubicación</th>
        <th className="hidden w-[20%] p-3 md:table-cell">Registrado por</th>
        <th className="w-28 p-3 text-right sm:w-40">Acción</th>
      </tr>
    </thead>
  )
}

export function AcervoRegistro({ registro, esModificable, eliminando, onEditar, onEliminar }: Props) {
  const [abierto, setAbierto] = useState(false)
  const { desde, hasta } = rangoAniosAcervo(registro)
  const periodo = desde === hasta ? desde : `${desde ?? '—'} – ${hasta ?? '—'}`
  const digital = registro.tipo === 'digital'
  const Icono = digital ? HardDrive : FolderArchive
  const detalleId = `acervo-detalle-${registro.id}`

  return (
    <Fragment>
      <tr className={cn('align-top transition-colors', abierto ? 'bg-muted/30' : 'hover:bg-muted/20')}>
        <td className="p-3 [overflow-wrap:anywhere]">
          <div>
            <div className="min-w-0">
              <button type="button" className="text-left text-xs font-medium text-foreground hover:text-primary" onClick={() => setAbierto(!abierto)} aria-expanded={abierto} aria-controls={detalleId}>
                {registro.serie_documental}
              </button>
              <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-mini text-muted-foreground">
                <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium', digital ? 'bg-info-soft text-info-fg' : 'bg-muted text-muted-foreground')}>
                  <Icono className="h-3 w-3 shrink-0" />
                  {digital ? 'Digital' : 'Físico'}
                </span>
                <span>{registro.fuente === 'sgd' ? 'SGD' : 'Manual'}</span>
              </p>
            </div>
          </div>
        </td>
        <td className="hidden p-3 text-xs text-muted-foreground sm:table-cell">{periodo ?? '—'}</td>
        <td className="p-3 text-xs [overflow-wrap:anywhere]">
          <span className="font-mono font-medium text-muted-foreground">{registro.cantidad_unidades}</span>
          <span className="mt-0.5 block text-mini text-muted-foreground">{registro.unidad_conservacion}</span>
        </td>
        <td className="hidden p-3 text-xs text-muted-foreground [overflow-wrap:anywhere] lg:table-cell">{registro.ubicacion || '—'}</td>
        <td className="hidden p-3 [overflow-wrap:anywhere] md:table-cell">
          <UsuarioRegistro usuario={registro.registrado_por} fecha={registro.created_at} fuente={registro.fuente} />
        </td>
        <td className="p-3">
          <div className="flex items-center justify-end gap-1">
            <Can permiso="anexos.registrar">
              <Button type="button" size="sm" className="h-8 gap-1.5 border border-primary bg-primary px-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover sm:px-3" disabled={!esModificable} onClick={() => onEditar(registro)} aria-label={`Editar ${registro.serie_documental}`}>
                <Pencil className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Editar</span>
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" disabled={!esModificable || eliminando} onClick={() => onEliminar(registro)} aria-label={`Eliminar ${registro.serie_documental}`}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </Can>
            <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => setAbierto(!abierto)} aria-expanded={abierto} aria-controls={detalleId} aria-label={abierto ? 'Ocultar detalle' : 'Ver detalle'}>
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', abierto && 'rotate-180')} />
            </Button>
          </div>
        </td>
      </tr>
      {abierto && (
        <tr id={detalleId} className="border-b bg-muted/20">
          <td colSpan={6} className="px-4 py-3 [overflow-wrap:anywhere]">
            <dl className="grid gap-3 text-xs sm:grid-cols-2">
              <div>
                <dt className="text-nota text-muted-foreground">Descripción</dt>
                <dd className="mt-1 whitespace-pre-wrap">{registro.descripcion || 'Sin descripción'}</dd>
              </div>
              <div>
                <dt className="text-nota text-muted-foreground">Ubicación</dt>
                <dd className="mt-1 whitespace-pre-wrap">{registro.ubicacion || '—'}</dd>
              </div>
              <div>
                <dt className="text-nota text-muted-foreground">Periodo</dt>
                <dd className="mt-1">{periodo ?? '—'}</dd>
              </div>
              <div className="print:hidden">
                <dt className="mb-1 text-nota text-muted-foreground">Registrado por</dt>
                <dd><UsuarioRegistro usuario={registro.registrado_por} fecha={registro.created_at} fuente={registro.fuente} /></dd>
              </div>
            </dl>
          </td>
        </tr>
      )}
    </Fragment>
  )
}
