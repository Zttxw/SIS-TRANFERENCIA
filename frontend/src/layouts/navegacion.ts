import {
  Archive,
  ClipboardList,
  FileCheck2,
  FileText,
  FolderTree,
  LayoutDashboard,
  type LucideIcon,
  MessageSquareWarning,
  Package,
  PackageOpen,
  Send,
  Settings,
  Users,
} from 'lucide-react'

import { PERMISOS, type Permiso } from '@/auth/permisos'

/**
 * Navegación del sidebar: estructura PLANA por anexo (decisión confirmada con
 * el usuario, plan §10). Cada ítem se oculta si el usuario no tiene `permiso`.
 * Las rutas se cablean en E3+ a medida que cada pantalla exista; por ahora el
 * sidebar las lista con gating correcto.
 */
export interface ItemNav {
  etiqueta: string
  ruta: string
  icono: LucideIcon
  permiso: Permiso
}

export const ITEMS_NAV: ItemNav[] = [
  {
    etiqueta: 'Dashboard',
    ruta: '/',
    icono: LayoutDashboard,
    permiso: PERMISOS.VerAnexos,
  },
  {
    etiqueta: 'Estructura Orgánica',
    ruta: '/organigrama',
    icono: FolderTree,
    permiso: PERMISOS.VerAnexos,
  },
  {
    etiqueta: 'Anexo 01 · Documentos',
    ruta: '/documentos',
    icono: FileText,
    permiso: PERMISOS.VerAnexos,
  },
  {
    etiqueta: 'Anexo 02 · Gestión',
    ruta: '/gestion',
    icono: ClipboardList,
    permiso: PERMISOS.VerAnexos,
  },
  {
    etiqueta: 'Anexo 03 · Acervo',
    ruta: '/acervo',
    icono: Archive,
    permiso: PERMISOS.VerAnexos,
  },
  {
    etiqueta: 'Anexo 04 · Patrimonio',
    ruta: '/patrimonio',
    icono: Package,
    permiso: PERMISOS.VerAnexos,
  },
  {
    etiqueta: 'Anexo 05 · Personal',
    ruta: '/personal',
    icono: Users,
    permiso: PERMISOS.VerAnexos,
  },
  {
    etiqueta: 'Anexo 06 · No patrimonial',
    ruta: '/nopatrimonial',
    icono: PackageOpen,
    permiso: PERMISOS.VerAnexos,
  },
  {
    etiqueta: 'Observaciones',
    ruta: '/observaciones',
    icono: MessageSquareWarning,
    permiso: PERMISOS.VerAnexos,
  },
  {
    etiqueta: 'Entregas',
    ruta: '/entregas',
    icono: Send,
    permiso: PERMISOS.VerAnexos,
  },
  {
    etiqueta: 'Acta',
    ruta: '/acta',
    icono: FileCheck2,
    permiso: PERMISOS.GenerarActas,
  },
  {
    etiqueta: 'Administración',
    ruta: '/admin',
    icono: Settings,
    permiso: PERMISOS.GestionarUsuarios,
  },
]
