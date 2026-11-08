import {
  Archive,
  ClipboardList,
  FileCheck2,
  Files,
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

export interface SubItemNav {
  etiqueta: string
  ruta: string
  icono: LucideIcon
  permiso: Permiso
}

export interface ItemNav {
  etiqueta: string
  ruta?: string
  icono: LucideIcon
  permiso: Permiso
  hijos?: SubItemNav[]
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
    etiqueta: 'Anexos de Transferencia',
    icono: Files,
    permiso: PERMISOS.VerAnexos,
    hijos: [
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
    ],
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
