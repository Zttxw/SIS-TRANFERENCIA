import { useState } from 'react'
import {
  Building2,
  FolderTree,
  Inbox,
  Send,
} from 'lucide-react'

import { Can } from '@/auth/Can'
import { useDependenciaActiva } from '@/auth/hooks'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { RemitirModal } from '@/features/dashboard/RemitirModal'
import { RevisarModal } from '@/features/dashboard/RevisarModal'
import type {
  DependenciaResumen,
  EntregaItem,
} from '@/types/transferencia'
import { ArbolDependenciasView } from './ArbolDependenciasView'
import { BandejaRevisorView } from './BandejaRevisorView'
import { DetalleEntregaModal } from './DetalleEntregaModal'
import { DocumentosFirmaPanel } from './DocumentosFirmaPanel'
import { useEntregas, useEstadoEntrega } from './use-entregas'

type PestañaActiva = 'bandeja' | 'arbol' | 'mi_entrega'

export function EntregasPage() {
  const { dependenciaId } = useDependenciaActiva()
  const [tab, setTab] = useState<PestañaActiva>('bandeja')

  // Modales
  const [modalRevisarEntrega, setModalRevisarEntrega] = useState<EntregaItem | null>(null)
  const [modalRemitirAbierto, setModalRemitirAbierto] = useState(false)
  const [dependenciaExaminar, setDependenciaExaminar] = useState<DependenciaResumen | null>(null)

  // Consultar entregas para badge de pendientes
  const { data: entregasResp } = useEntregas({ per_page: 50 })
  const pendientesCount =
    entregasResp?.data?.filter((e) => e.estado === 'remitida' || e.estado === 'en_revision')
      .length ?? 0

  // Estado del centro de costo activo para la pestaña "Mi Entrega"
  const { data: estadoMiDep, isLoading: cargandoMiDep } = useEstadoEntrega(dependenciaId)

  return (
    <div className="space-y-6">
      {/* Encabezado Principal */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              Directiva N.° 001-2026-MDSJ/A · §7.8
            </span>
            <span className="text-xs text-muted-foreground">
              Flujo Jerárquico de Remisión y Dictamen
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Monitoreo y Flujo Jerárquico de Entregas
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestión de remisiones escalonadas (3° nivel → 2° nivel → 1° nivel → ETTS Institucional)
            y dictamen de consolidación u observación.
          </p>
        </div>
      </div>

      {/* Pestañas de Navegación de la Vista */}
      <div className="flex border-b">
        <button
          type="button"
          onClick={() => setTab('bandeja')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors ${
            tab === 'bandeja'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Inbox className="h-4 w-4" />
          <span>Bandeja del Revisor</span>
          {pendientesCount > 0 && (
            <span className="rounded-full bg-warning-soft px-2 py-0.5 text-nota font-semibold text-warning-fg">
              {pendientesCount} pendiente{pendientesCount !== 1 ? 's' : ''}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setTab('arbol')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors ${
            tab === 'arbol'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <FolderTree className="h-4 w-4" />
          <span>Árbol Municipal (107 Dependencias)</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('mi_entrega')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors ${
            tab === 'mi_entrega'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Send className="h-4 w-4" />
          <span>Remisión de mi Despacho</span>
        </button>
      </div>

      {/* Contenido de la pestaña activa */}
      {tab === 'bandeja' && (
        <BandejaRevisorView
          onRevisar={(entrega) => setModalRevisarEntrega(entrega)}
          onVerDetalle={(dep) => setDependenciaExaminar(dep)}
        />
      )}

      {tab === 'arbol' && (
        <ArbolDependenciasView onVerDetalle={(dep) => setDependenciaExaminar(dep)} />
      )}

      {tab === 'mi_entrega' && (
        <div className="space-y-4 max-w-3xl">
          {!dependenciaId ? (
            <Card className="p-8 text-center border-dashed">
              <Building2 className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <h3 className="font-semibold text-sm">Seleccione un centro de costo</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Para consultar o remitir la entrega formal de un despacho, elija el centro de costo
                en el selector superior o desde el árbol de dependencias.
              </p>
            </Card>
          ) : cargandoMiDep ? (
            <Card className="p-12 text-center">
              <p className="text-xs text-muted-foreground">Consultando estado de entrega...</p>
            </Card>
          ) : (
            <>
            <DocumentosFirmaPanel
              dependenciaId={dependenciaId}
              estadoEntrega={estadoMiDep?.entrega?.estado ?? null}
            />
            <Card className="border shadow-xs">
              <CardHeader className="bg-muted/15 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-muted">
                      {estadoMiDep?.dependencia.codigo}
                    </span>
                    <CardTitle className="text-base mt-1">
                      {estadoMiDep?.dependencia.nombre}
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Estado de culminación y remisión formal según Directiva §7.8
                    </CardDescription>
                  </div>

                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary capitalize">
                    {estadoMiDep?.entrega?.estado ?? 'Borrador'}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="rounded-lg border bg-muted/30 p-3.5 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground font-medium">Destino de la entrega:</span>
                    <span className="font-semibold text-foreground">
                      {estadoMiDep?.entrega?.hacia_etts || !estadoMiDep?.dependencia.parent_id
                        ? 'Equipo Técnico de Transferencia Saliente (ETTS Institucional)'
                        : 'Superior Jerárquico Inmediato (Centro de costo padre)'}
                    </span>
                  </div>

                  {estadoMiDep?.entrega?.remitida_en && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">Remitida en:</span>
                      <span className="text-foreground">
                        {new Date(estadoMiDep.entrega.remitida_en).toLocaleString('es-PE')}
                      </span>
                    </div>
                  )}

                  {estadoMiDep?.entrega?.consolidada_en && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">Consolidada en:</span>
                      <span className="text-success-fg font-semibold">
                        {new Date(estadoMiDep.entrega.consolidada_en).toLocaleString('es-PE')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Acciones de Remisión */}
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {estadoMiDep?.entrega?.estado === 'remitida'
                      ? 'La entrega se encuentra en evaluación por el superior jerárquico.'
                      : estadoMiDep?.entrega?.estado === 'consolidada'
                      ? 'La entrega ha sido consolidada formalmente. Puede emitir el acta final.'
                      : 'Una vez completados los anexos, remita la información para su revisión.'}
                  </span>

                  {(!estadoMiDep?.entrega ||
                    estadoMiDep.entrega.estado === 'borrador' ||
                    estadoMiDep.entrega.estado === 'observada') && (
                    <Can permiso="entregas.remitir">
                      <Button
                        onClick={() => setModalRemitirAbierto(true)}
                        className="gap-1.5 text-xs"
                      >
                        <Send className="h-3.5 w-3.5" />
                        Remitir al Superior
                      </Button>
                    </Can>
                  )}
                </div>
              </CardContent>
            </Card>
            </>
          )}
        </div>
      )}

      {/* Modal de Dictamen / Revisar */}
      {modalRevisarEntrega && (
        <RevisarModal
          open={Boolean(modalRevisarEntrega)}
          onClose={() => setModalRevisarEntrega(null)}
          dependenciaId={modalRevisarEntrega.dependencia_id}
          dependenciaNombre={modalRevisarEntrega.dependencia.nombre}
        />
      )}

      {/* Modal de Remitir */}
      {estadoMiDep && (
        <RemitirModal
          open={modalRemitirAbierto}
          onClose={() => setModalRemitirAbierto(false)}
          dependenciaId={estadoMiDep.dependencia.id}
          dependenciaNombre={estadoMiDep.dependencia.nombre}
          haciaEtts={
            Boolean(estadoMiDep.entrega?.hacia_etts) || !estadoMiDep.dependencia.parent_id
          }
        />
      )}

      {/* Modal Examinar Estado */}
      <DetalleEntregaModal
        dependencia={dependenciaExaminar}
        open={Boolean(dependenciaExaminar)}
        onClose={() => setDependenciaExaminar(null)}
      />
    </div>
  )
}
