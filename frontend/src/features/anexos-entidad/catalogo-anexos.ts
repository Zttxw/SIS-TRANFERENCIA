import {
  Archive,
  ClipboardList,
  FileCheck2,
  FolderTree,
  Package,
  PackageOpen,
  Users,
  type LucideIcon,
} from 'lucide-react'

import type { DependenciaSemaforoItem, EstadoEntrega } from '@/types/transferencia'
import type { TipoDocumentoFirma } from '@/features/firmaperu/firmaperu.types'
import type { TonoCarpeta } from './CarpetaSvg'

/** ¿La dependencia ya remitió su entrega? (remitida / en revisión / consolidada). */
export function estaRemitida(estado: EstadoEntrega | 'sin_iniciar'): boolean {
  return estado === 'remitida' || estado === 'en_revision' || estado === 'consolidada'
}

/**
 * Tono de la carpeta por estado de remisión: verde = remitida (o consolidada),
 * gris = aún sin remitir, ámbar = observada (devuelta para subsanar).
 */
export function tonoDeCarpeta(estado: EstadoEntrega | 'sin_iniciar'): TonoCarpeta {
  if (estado === 'observada') return 'ambar'
  return estaRemitida(estado) ? 'verde' : 'gris'
}

/** Estado visual de un "archivo" de anexo dentro de la carpeta de una dependencia. */
export type EstadoAnexo = 'listo' | 'parcial' | 'pendiente' | 'informativo'

export interface AnexoArchivo {
  codigo: string
  nombre: string
  icono: LucideIcon
  /** Tipo para previsualizar/descargar el PDF oficial vía módulo de firma. */
  tipoFirma: TipoDocumentoFirma
  estado: EstadoAnexo
  detalle: string
}

/**
 * Deriva la lista de los 7 anexos (como "archivos") de una dependencia a partir
 * de la fila del tablero operativo. El tablero expone patrimonio, observaciones
 * y estado de entrega; el resto se rotula por el estado global de la entrega
 * (la ficha detallada vive en el portal de cada dependencia). El objetivo aquí
 * es la navegación tipo explorador, no la captura.
 */
export function anexosDeLaDependencia(dep: DependenciaSemaforoItem): AnexoArchivo[] {
  const consolidada = dep.estado_entrega === 'consolidada'
  const remitida = dep.estado_entrega === 'remitida' || consolidada
  const pctPat = dep.patrimonio_porcentaje ?? 0
  const estadoRemision: EstadoAnexo = consolidada
    ? 'listo'
    : remitida
      ? 'parcial'
      : 'pendiente'

  return [
    {
      codigo: 'Anexo 01',
      nombre: 'Estructura Orgánica',
      icono: FolderTree,
      tipoFirma: 'anexo01',
      estado: 'informativo',
      detalle: `Nivel ${dep.nivel} · Centro de costo`,
    },
    {
      codigo: 'Anexo 02',
      nombre: 'Informe de Gestión',
      icono: ClipboardList,
      tipoFirma: 'anexo02',
      estado: estadoRemision,
      detalle: 'Memoria, funciones, logros y dificultades',
    },
    {
      codigo: 'Anexo 03',
      nombre: 'Acervo Documental',
      icono: Archive,
      tipoFirma: 'anexo03',
      estado: estadoRemision,
      detalle: 'Inventario de archivos y series documentales',
    },
    {
      codigo: 'Anexo 04',
      nombre: 'Bienes Patrimoniales',
      icono: Package,
      tipoFirma: 'anexo04',
      estado:
        dep.patrimonio_total === 0
          ? 'informativo'
          : pctPat >= 100
            ? 'listo'
            : pctPat > 0
              ? 'parcial'
              : 'pendiente',
      detalle:
        dep.patrimonio_total > 0
          ? `${dep.patrimonio_confirmados}/${dep.patrimonio_total} verificados (${pctPat}%)`
          : 'Sin bienes SIGA asignados',
    },
    {
      codigo: 'Anexo 05',
      nombre: 'Personal a Cargo',
      icono: Users,
      tipoFirma: 'anexo05',
      estado: estadoRemision,
      detalle: 'Relación de servidores y régimen laboral',
    },
    {
      codigo: 'Anexo 06',
      nombre: 'Bienes No Patrimoniales',
      icono: PackageOpen,
      tipoFirma: 'anexo06',
      estado: estadoRemision,
      detalle: 'Activos no catalogados en SIGA',
    },
    {
      codigo: 'Anexo 07',
      nombre: 'Acta de Transferencia',
      icono: FileCheck2,
      tipoFirma: 'anexo07',
      estado: consolidada ? 'listo' : 'pendiente',
      detalle: consolidada ? 'Acta consolidada' : 'Pendiente de cierre',
    },
  ]
}

/** Metadatos de presentación por estado de anexo (chip + punto de color). */
export const ESTILO_ESTADO: Record<
  EstadoAnexo,
  { etiqueta: string; chip: string; punto: string }
> = {
  listo: {
    etiqueta: 'Listo',
    chip: 'bg-success-soft text-success-fg border-success-border',
    punto: 'bg-success',
  },
  parcial: {
    etiqueta: 'En proceso',
    chip: 'bg-info-soft text-info-fg border-info-border',
    punto: 'bg-info',
  },
  pendiente: {
    etiqueta: 'Pendiente',
    chip: 'bg-warning-soft text-warning-fg border-warning-border',
    punto: 'bg-warning',
  },
  informativo: {
    etiqueta: 'Informativo',
    chip: 'bg-muted text-muted-foreground border-border',
    punto: 'bg-muted-foreground/40',
  },
}
