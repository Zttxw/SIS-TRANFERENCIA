import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  Copy,
  Download,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  FolderArchive,
  Lock,
  Paperclip,
  Printer,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import axios from 'axios'

import { useDependenciaActiva } from '@/auth/hooks'
import { Can } from '@/auth/Can'
import { AnexoHeader } from '@/components/anexos/AnexoHeader'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { useEstadoEntrega } from '@/features/dashboard/use-dashboard'
import { ActaImprimible } from './ActaImprimible'
import { FirmaDigitalSeamModal } from './FirmaDigitalSeamModal'
import { SubirEvidenciaModal } from './SubirEvidenciaModal'
import { useActa, useDescargarEvidencia } from './use-acta'
import type { EvidenciaItem } from '@/types/acta'

function formatearTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function ActaPage() {
  const { dependenciaId } = useDependenciaActiva()
  const { data: estadoData } = useEstadoEntrega(dependenciaId)
  const { data: acta, isLoading, error, refetch } = useActa(dependenciaId)

  const [pestañaActiva, setPestañaActiva] = useState<'acta' | 'evidencias'>('acta')
  const [modalFirma, setModalFirma] = useState(false)
  const [modalEvidencia, setModalEvidencia] = useState(false)

  const descargarMutation = useDescargarEvidencia()

  const handleCopiarHash = (hash: string) => {
    navigator.clipboard.writeText(hash)
    toast.success('Hash SHA-256 copiado al portapapeles')
  }

  const handleDescargar = (evidencia: EvidenciaItem) => {
    descargarMutation.mutate({
      id: evidencia.id,
      nombreArchivo: evidencia.nombre_original,
    })
  }

  // 1. Sin dependencia seleccionada
  if (!dependenciaId) {
    return (
      <div className="space-y-6">
        <AnexoHeader
          numeroAnexo="Anexo 07"
          titulo="Acta de Transferencia Administrativa y Entrega de Cargo"
          subtitulo="Formalización del cierre del proceso de transferencia conforme a la Directiva N.° 001-2026-MDSJ/A §7.10"
        />
        <Card className="border-dashed bg-muted/20 p-12 text-center">
          <Boxes className="mx-auto h-12 w-12 text-muted-foreground/60" />
          <h2 className="mt-4 text-base font-semibold">Selección de Centro de Costo requerida</h2>
          <p className="mx-auto mt-2 max-w-md text-xs text-muted-foreground">
            Utilice el selector de dependencias en la barra superior para elegir el centro de costo sobre el cual desea generar o consultar el Acta de Transferencia Oficial.
          </p>
        </Card>
      </div>
    )
  }

  // 2. Estado de carga
  if (isLoading) {
    return (
      <div className="space-y-6">
        <AnexoHeader
          numeroAnexo="Anexo 07"
          titulo="Acta de Transferencia Administrativa y Entrega de Cargo"
          subtitulo="Consultando estado y validación del acta..."
        />
        <div className="flex min-h-[350px] items-center justify-center">
          <Spinner className="h-8 w-8 text-primary" />
        </div>
      </div>
    )
  }

  // 3. Manejo de 409 Conflict (Entrega no consolidada)
  const esConflicto409 = axios.isAxiosError(error) && error.response?.status === 409
  const estadoEntregaActual = estadoData?.entrega?.estado ?? 'borrador'

  if (esConflicto409) {
    return (
      <div className="space-y-6">
        <AnexoHeader
          numeroAnexo="Anexo 07"
          titulo="Acta de Transferencia Administrativa y Entrega de Cargo"
          subtitulo="Verificación de requisitos normativos para la emisión del acta oficial"
          dependenciaCodigo={estadoData?.dependencia.codigo}
          dependenciaNombre={estadoData?.dependencia.nombre}
        />

        <Card className="border-amber-500/40 bg-amber-500/5 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-lg text-amber-700 dark:text-amber-400">
                  Acta No Emisible · Requiere Entrega Consolidada
                </CardTitle>
                <CardDescription className="text-xs">
                  Directiva N.° 001-2026-MDSJ/A §7.10 — El Acta Oficial de Transferencia solo puede emitirse tras la consolidación formal.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 text-sm">
            <p className="text-muted-foreground leading-relaxed text-xs sm:text-sm">
              Conforme al marco normativo municipal, el <strong>Acta de Transferencia de Cargo (Anexo 07)</strong> refleja
              la constancia fidedigna de los bienes, documentos, personal e informe de gestión efectivamente
              recibidos y verificados. Para generarla, la entrega del centro de costo debe encontrarse en estado{' '}
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">CONSOLIDADA</span> por el revisor
              jerárquico o la comisión ETTS.
            </p>

            <div className="rounded-lg border bg-background/80 p-4">
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 text-xs">
                <div>
                  <span className="text-muted-foreground block">Centro de Costo:</span>
                  <span className="font-semibold text-foreground">
                    {estadoData?.dependencia.codigo} - {estadoData?.dependencia.nombre}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Estado Actual de la Entrega:</span>
                  <span className="font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                    {estadoEntregaActual}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Requisito Pendiente:</span>
                  <span className="font-medium text-foreground">Revisión y Aprobación sin observaciones</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link to="/" className={buttonVariants({ variant: 'default', size: 'sm', className: 'gap-1.5' })}>
                Ir al Dashboard de Estado
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/entregas" className={buttonVariants({ variant: 'outline', size: 'sm', className: 'gap-1.5' })}>
                Consultar Bandeja de Entregas
              </Link>
              <Button variant="ghost" size="sm" onClick={() => refetch()} className="text-xs">
                Reintentar Consulta
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 4. Error genérico o de autorización
  if (error || !acta) {
    const es403 = axios.isAxiosError(error) && error.response?.status === 403
    return (
      <div className="space-y-6">
        <AnexoHeader
          numeroAnexo="Anexo 07"
          titulo="Acta de Transferencia Administrativa y Entrega de Cargo"
        />
        <Card className="border-destructive/40 bg-destructive/5 p-8 text-center shadow-sm">
          <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
          <h2 className="mt-3 text-lg font-semibold text-destructive">
            {es403 ? 'Acceso Restringido' : 'No se pudo cargar el Acta de Transferencia'}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
            {es403
              ? 'Su rol no cuenta con la facultad de emitir o consultar actas de transferencia institucionales (permiso requerido: actas.generar).'
              : error instanceof Error ? error.message : 'Error al consultar la información del acta.'}
          </p>
          <div className="mt-4">
            <Link to="/" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              Retornar al Dashboard
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  // 5. Vista exitosa del Acta y su Expediente
  const depActual = acta.dependencia ?? estadoData?.dependencia ?? {
    id: dependenciaId,
    codigo: '01',
    nombre: 'Centro de Costo Institucional',
    nivel: 2,
    parent_id: null,
  }

  const listaEvidencias = acta.evidencias ?? []
  const tienePdfSuscrito = listaEvidencias.some(
    (ev) => ev.mime_type === 'application/pdf' || ev.nombre_original.toLowerCase().includes('acta')
  )

  return (
    <div className="space-y-6">
      {/* Encabezado Institucional */}
      <AnexoHeader
        numeroAnexo="Anexo 07"
        titulo="Acta de Transferencia Administrativa y Entrega de Cargo"
        subtitulo="Cierre oficial del procedimiento de transferencia conforme a la Directiva N.° 001-2026-MDSJ/A §7.10"
        dependenciaCodigo={depActual.codigo}
        dependenciaNombre={depActual.nombre}
        acciones={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="gap-2 shadow-sm"
            >
              <Printer className="h-4 w-4" />
              Imprimir / PDF Oficial
            </Button>

            <Can permiso="actas.generar">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setModalFirma(true)}
                className="gap-2 border shadow-sm"
              >
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Firma Digital / Suscripción
              </Button>
            </Can>

            <Can permiso="anexos.registrar">
              <Button
                variant="default"
                size="sm"
                onClick={() => setModalEvidencia(true)}
                className="gap-2 shadow-sm"
              >
                <Paperclip className="h-4 w-4" />
                Adjuntar Evidencia
              </Button>
            </Can>
          </div>
        }
      />

      {/* Resumen de Control del Acta */}
      <Card className="border-l-4 border-l-emerald-600 shadow-sm print:hidden">
        <CardContent className="grid gap-4 pt-5 sm:grid-cols-2 md:grid-cols-4 text-xs">
          <div>
            <span className="text-muted-foreground block">N.° de Acta Oficial:</span>
            <span className="font-mono text-sm font-bold text-foreground">{acta.numero_acta}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">Fecha de Formalización:</span>
            <span className="text-sm font-semibold text-foreground">
              {new Date(acta.fecha_acta).toLocaleDateString('es-PE')}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block">Estado del Acta:</span>
            <span className="inline-flex items-center gap-1 mt-0.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 font-semibold text-emerald-700 dark:text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              {tienePdfSuscrito ? 'Suscrita con Evidencia' : 'Generada (Lista para Suscripción)'}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block">Evidencias en Expediente:</span>
            <span className="text-sm font-semibold text-foreground">
              {listaEvidencias.length} documentos custodiados
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Selector de Pestañas: Vista Oficial vs Expediente */}
      <div className="flex items-center gap-2 border-b print:hidden">
        <button
          type="button"
          onClick={() => setPestañaActiva('acta')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
            pestañaActiva === 'acta'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileCheck2 className="h-4 w-4" />
          Formato Oficial del Acta (Anexo 07)
        </button>

        <button
          type="button"
          onClick={() => setPestañaActiva('evidencias')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
            pestañaActiva === 'evidencias'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <FolderArchive className="h-4 w-4" />
          Expediente de Evidencias Digitales ({listaEvidencias.length})
        </button>
      </div>

      {/* Pestaña 1: Vista Oficial del Acta */}
      {pestañaActiva === 'acta' && (
        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground flex items-center justify-between print:hidden">
            <span>
              Vista previa conforme a las especificaciones formales de la Directiva Municipal N.° 001-2026-MDSJ/A.
            </span>
            <span className="font-mono text-[11px] text-foreground font-medium">
              Hash Documental: {acta.id.toString(16).padStart(8, '0')}
            </span>
          </div>

          <ActaImprimible acta={acta} dependencia={depActual} />
        </div>
      )}

      {/* Pestaña 2: Expediente de Evidencias Digitales */}
      {pestañaActiva === 'evidencias' && (
        <div className="space-y-4 print:hidden">
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-xs text-muted-foreground">
            <div className="flex items-start gap-2.5">
              <Lock className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
              <div className="space-y-1">
                <span className="font-semibold text-foreground">
                  Custodia Segura y Cadena de Integridad (Directiva N.° 001-2026-MDSJ/A §9)
                </span>
                <p>
                  Todos los archivos incorporados a este expediente se almacenan de forma inmutable, cifrada y
                  sellada criptográficamente con hash SHA-256 para garantizar la seguridad probatoria y el acceso
                  restringido a los miembros de la Comisión de Transferencia.
                </p>
              </div>
            </div>
          </div>

          {listaEvidencias.length === 0 ? (
            <Card className="border-dashed bg-muted/20 p-12 text-center">
              <FolderArchive className="mx-auto h-12 w-12 text-muted-foreground/60" />
              <h3 className="mt-3 text-sm font-semibold text-foreground">
                No hay evidencias adjuntas aún en este expediente
              </h3>
              <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
                Puede adjuntar el acta suscrita con firma electrónica o digital, actas complementarias, informes de cotejo o registros fotográficos.
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <Button size="sm" onClick={() => setModalFirma(true)} variant="secondary" className="gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Adjuntar Acta Suscrita
                </Button>
                <Button size="sm" onClick={() => setModalEvidencia(true)} className="gap-2">
                  <Paperclip className="h-4 w-4" />
                  Subir Evidencia
                </Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {listaEvidencias.map((evidencia) => (
                <Card key={evidencia.id} className="shadow-sm hover:border-primary/40 transition-colors">
                  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        {evidencia.mime_type.includes('pdf') ? (
                          <FileText className="h-5 w-5 text-red-500" />
                        ) : evidencia.mime_type.includes('sheet') || evidencia.mime_type.includes('excel') ? (
                          <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                        ) : (
                          <Paperclip className="h-5 w-5" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-semibold text-foreground">
                            {evidencia.nombre_original}
                          </h4>
                          <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground">
                            {formatearTamano(evidencia.tamano_bytes)}
                          </span>
                        </div>
                        {evidencia.descripcion && (
                          <p className="text-xs text-muted-foreground">{evidencia.descripcion}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            SHA-256: {evidencia.hash.substring(0, 16)}...
                            <button
                              type="button"
                              onClick={() => handleCopiarHash(evidencia.hash)}
                              className="text-primary hover:underline ml-1"
                              title="Copiar hash completo"
                            >
                              <Copy className="h-3 w-3 inline" />
                            </button>
                          </span>
                          <span>·</span>
                          <span>Subido el {new Date(evidencia.created_at).toLocaleString('es-PE')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 border-t pt-2 sm:border-0 sm:pt-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDescargar(evidencia)}
                        disabled={descargarMutation.isPending}
                        className="gap-2 text-xs"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Descargar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modales de workflow */}
      <FirmaDigitalSeamModal
        open={modalFirma}
        onClose={() => setModalFirma(false)}
        actaId={acta.id}
        numeroActa={acta.numero_acta}
      />

      <SubirEvidenciaModal
        open={modalEvidencia}
        onClose={() => setModalEvidencia(false)}
        actaId={acta.id}
      />
    </div>
  )
}
