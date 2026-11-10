import {
  Archive,
  BarChart3,
  ClipboardList,
  FileCheck2,
  Files,
  FolderTree,
  LayoutDashboard,
  type LucideIcon,
  Package,
  PackageOpen,
  UserCog,
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
    etiqueta: 'Usuarios y Servidores',
    ruta: '/usuarios',
    icono: UserCog,
    permiso: PERMISOS.GestionarUsuarios,
  },
  {
    etiqueta: 'Anexos de Transferencia',
    icono: Files,
    permiso: PERMISOS.VerAnexos,
    hijos: [
      {
        etiqueta: 'Anexo 01 · Organigrama',
        ruta: '/organigrama',
        icono: FolderTree,
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
        etiqueta: 'Anexo 07 · Acta',
        ruta: '/acta',
        icono: FileCheck2,
        permiso: PERMISOS.VerAnexos,
      },
    ],
  },
  {
    etiqueta: 'Reportes',
    ruta: '/reportes',
    icono: BarChart3,
    permiso: PERMISOS.VerAnexos,
  },
]
