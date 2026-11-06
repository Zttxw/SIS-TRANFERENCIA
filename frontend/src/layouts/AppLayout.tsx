import { Building2, LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'

import { useAuth } from '@/auth/hooks'
import { Button } from '@/components/ui/button'
import { DependenciaSelector } from '@/features/organization/DependenciaSelector'
import { cn } from '@/lib/utils'

import { ITEMS_NAV } from './navegacion'

/**
 * Layout base autenticado (plan E2): sidebar plano por anexo (gating por
 * permiso), topbar con selector de dependencia + usuario + logout. Responsive:
 * en móvil el sidebar se despliega como overlay.
 */
export function AppLayout() {
  const { usuario, permisos, cerrarSesion } = useAuth()
  const [menuAbierto, setMenuAbierto] = useState(false)

  const items = ITEMS_NAV.filter((item) => permisos.has(item.permiso))

  const nav = (
    <nav className="flex-1 space-y-0.5 overflow-y-auto p-2 text-sm">
      {items.map((item) => {
        const Icono = item.icono
        return (
          <NavLink
            key={item.ruta}
            to={item.ruta}
            end={item.ruta === '/'}
            onClick={() => setMenuAbierto(false)}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 transition-colors',
                isActive
                  ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
              )
            }
          >
            <Icono className="h-4 w-4 shrink-0" />
            <span className="truncate">{item.etiqueta}</span>
          </NavLink>
        )
      })}
    </nav>
  )

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar desktop */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
          <Building2 className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold leading-tight">
            SIS-TRANSFERENCIA
          </span>
        </div>
        {nav}
        <div className="border-t border-sidebar-border p-3 text-xs text-muted-foreground">
          Municipalidad Distrital de San Jerónimo
        </div>
      </aside>

      {/* Sidebar móvil (overlay) */}
      {menuAbierto && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMenuAbierto(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
            <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Building2 className="h-5 w-5 text-primary" />
                SIS-TRANSFERENCIA
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMenuAbierto(false)}
                aria-label="Cerrar menú"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            {nav}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b border-border px-4">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMenuAbierto(true)}
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <DependenciaSelector />

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight">
                {usuario?.nombre}
              </p>
              <p className="text-xs text-muted-foreground">
                DNI {usuario?.dni}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void cerrarSesion()}
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Salir</span>
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
