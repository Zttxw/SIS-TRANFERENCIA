import {
  Archive,
  BarChart3,
  CalendarDays,
  ClipboardList,
  FileCheck2,
  Files,
  FileText,
  FolderOpen,
  FolderTree,
  LayoutDashboard,
  type LucideIcon,
  MessageSquareWarning,
  Package,
  PackageOpen,
  PenLine,
  Send,
  UserCog,
  Users,
} from 'lucide-react'

import { PERMISOS, type Permiso } from '@/auth/permisos'

export interface SubItemNav {
  etiqueta: string
  ruta: string
  icono: LucideIcon
  permiso: Permiso
  permisosAlternativos?: readonly Permiso[]
}

export interface ItemNav {
  etiqueta: string
  ruta?: string
  icono: LucideIcon
  permiso: Permiso
  permisosAlternativos?: readonly Permiso[]
  hijos?: SubItemNav[]
}

export const ITEMS_NAV: ItemNav[] = [
  {
    etiqueta: 'Mi entrega',
    ruta: '/',
    icono: LayoutDashboard,
    permiso: PERMISOS.VerAnexos,
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
        permiso: PERMISOS.GenerarActas,
        permisosAlternativos: [PERMISOS.FirmarAnexos],
      },
    ],
  },
  {
    etiqueta: 'Anexos de la Entidad',
    ruta: '/anexos-entidad',
    icono: FolderOpen,
    permiso: PERMISOS.VerAnexos,
  },
  {
    etiqueta: 'Documentos SGD',
    ruta: '/documentos',
    icono: FileText,
    permiso: PERMISOS.VerAnexos,
  },
  {
    etiqueta: 'PDF y firma',
    ruta: '/pdf-firma',
    icono: PenLine,
    permiso: PERMISOS.VerAnexos,
  },
  {
    etiqueta: 'Entrega',
    ruta: '/entregas',
    icono: Send,
    permiso: PERMISOS.VerAnexos,
  },
  {
    etiqueta: 'Observaciones',
    ruta: '/observaciones',
    icono: MessageSquareWarning,
    permiso: PERMISOS.VerAnexos,
  },
  {
    etiqueta: 'Reportes',
    ruta: '/reportes',
    icono: BarChart3,
    permiso: PERMISOS.VerReportes,
  },
  {
    etiqueta: 'Usuarios y Servidores',
    ruta: '/usuarios',
    icono: UserCog,
    permiso: PERMISOS.GestionarUsuarios,
    permisosAlternativos: [PERMISOS.GestionarRoles],
  },
  {
    etiqueta: 'Cronograma',
    ruta: '/cronograma',
    icono: CalendarDays,
    permiso: PERMISOS.GestionarCronograma,
  },
  {
    etiqueta: 'Delegados ETTE',
    ruta: '/delegados',
    icono: UserCog,
    permiso: PERMISOS.GestionarDelegados,
  },
]
