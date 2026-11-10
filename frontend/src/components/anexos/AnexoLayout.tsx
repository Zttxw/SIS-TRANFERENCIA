import type { ReactNode } from 'react'
import { Building2 } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { AnexoHeader } from './AnexoHeader'

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

  /** Botón(es) de acción primaria (p. ej. «Nueva Serie», «PDF oficial»). */
  acciones?: ReactNode
  /** Contenido central del anexo (filtros + tabla + modal). */
  children: ReactNode
}

/**
 * Contenedor único de toda página de anexo.
 *
 * Compone el encabezado del anexo y resuelve el guard de «seleccione un centro de
 * costo». El sistema es una herramienta de apoyo para completar y generar los
 * anexos; el flujo de remisión/consolidación lo lleva el SGD, por lo que el anexo
 * es siempre editable (sin bloqueo por estado de entrega).
 */
export function AnexoLayout({
  numeroAnexo,
  tituloCorto,
  titulo,
  subtitulo,
  guiaSeleccion = 'Utilice el selector de dependencias en la barra superior para gestionar la información de este anexo.',
  dependenciaId,
  dependencia,
  acciones,
  children,
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
        acciones={acciones}
      />

      {children}
    </div>
  )
}
