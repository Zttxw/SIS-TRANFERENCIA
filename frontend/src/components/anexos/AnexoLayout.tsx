import type { ReactNode } from 'react'
import { Building2 } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { BotonFirmaPeru } from '@/features/firmaperu/BotonFirmaPeru'
import type { TipoDocumentoFirma } from '@/features/firmaperu/firmaperu.types'
import type { ClaveAnexoObservable } from '@/types/observaciones'
import type { EstadoEntrega } from '@/types/transferencia'
import { AlertaBloqueoEntrega } from './AlertaBloqueoEntrega'
import { AnexoHeader } from './AnexoHeader'
import { EstadoAnexoChip } from './EstadoAnexoChip'
import { ObservacionesAnexoPanel } from './ObservacionesAnexoPanel'

const TIPOS_FIRMA: Partial<Record<ClaveAnexoObservable, TipoDocumentoFirma>> = {
  gestion: 'anexo02', acervo: 'anexo03', patrimonio: 'anexo04', personal: 'anexo05', nopatrimonial: 'anexo06',
}

export interface DependenciaResumenAnexo {
  codigo?: string
  nombre?: string
}

interface AnexoLayoutProps {
  /** Etiqueta normativa, p. ej. «Anexo 03». */
  numeroAnexo: string
  /** Título cuando aún no se eligió dependencia (guía de selección). */
  tituloCorto: string
  /** Título completo mostrado con la dependencia activa. */
  titulo: string
  subtitulo?: string
  /** Mensaje de la tarjeta de «seleccione centro de costo». */
  guiaSeleccion?: string

  dependenciaId: number | null
  dependencia?: DependenciaResumenAnexo
  estadoEntrega?: EstadoEntrega | null
  /** `true` si el anexo admite edición (borrador/observada). Pinta el chip. */
  esModificable?: boolean

  /** Botón(es) de acción primaria (p. ej. «Nueva Serie»). */
  acciones?: ReactNode
  /** Contenido central del anexo (filtros + tabla + modal). */
  children: ReactNode

  /** Clave para el panel de observaciones; omitir para ocultarlo. */
  anexoObservable?: ClaveAnexoObservable
  /** Id de la primera fila, para anclar las observaciones del anexo. */
  observableId?: number
}

/**
 * Contenedor único de toda página de anexo (F3, plan-mejoras-frontend §4).
 *
 * Compone, en un solo lugar y en orden fijo:
 *   AnexoHeader → chip de estado → AlertaBloqueoEntrega → contenido →
 *   ObservacionesAnexoPanel.
 *
 * También resuelve el guard de «seleccione un centro de costo» que antes cada
 * `*Page.tsx` reimplementaba a mano. Mejorar la UX del marco de un anexo pasa a
 * ser tocar este archivo, no N páginas.
 */
export function AnexoLayout({
  numeroAnexo,
  tituloCorto,
  titulo,
  subtitulo,
  guiaSeleccion = 'Utilice el selector de dependencias en la barra superior para gestionar la información de este anexo.',
  dependenciaId,
  dependencia,
  estadoEntrega,
  esModificable = true,
  acciones,
  children,
  anexoObservable,
  observableId,
}: AnexoLayoutProps) {
  if (!dependenciaId) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <AnexoHeader numeroAnexo={numeroAnexo} titulo={tituloCorto} subtitulo={subtitulo} />
        <Card className="border-dashed p-10 text-center">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground/60" />
          <h2 className="mt-4 text-base font-semibold">Selección de Centro de Costo requerida</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{guiaSeleccion}</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <AnexoHeader
        numeroAnexo={numeroAnexo}
        titulo={titulo}
        subtitulo={subtitulo}
        dependenciaCodigo={dependencia?.codigo}
        dependenciaNombre={dependencia?.nombre}
        acciones={
          <>
            <EstadoAnexoChip estadoEntrega={estadoEntrega} esModificable={esModificable} />
            {anexoObservable && TIPOS_FIRMA[anexoObservable] && (
              <BotonFirmaPeru key={`${anexoObservable}-${dependenciaId}`} tipoDocumento={TIPOS_FIRMA[anexoObservable]!} dependenciaId={dependenciaId} />
            )}
            {acciones}
          </>
        }
      />

      <AlertaBloqueoEntrega estadoEntrega={estadoEntrega} />

      {children}

      {anexoObservable && (
        <ObservacionesAnexoPanel
          anexo={anexoObservable}
          observableId={observableId}
          dependenciaId={dependenciaId}
          esModificable={esModificable}
        />
      )}
    </div>
  )
}
