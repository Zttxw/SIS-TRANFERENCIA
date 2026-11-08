import { ChevronDown, ChevronRight, LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '@/auth/hooks'
import { Button } from '@/components/ui/button'
import { DependenciaSelector } from '@/features/organization/DependenciaSelector'
import { cn } from '@/lib/utils'

import { ITEMS_NAV } from './navegacion'

/**
 * Layout base autenticado: barra lateral de navegación (sidebar) con identidad
 * institucional (#3484A5), submenú colapsable para anexos y topbar con selector de dependencia + usuario + logout.
 */
export function AppLayout() {
  const { usuario, permisos, cerrarSesion } = useAuth()
  const location = useLocation()
  const [menuAbierto, setMenuAbierto] = useState(false)

  // Rutas de anexos para detectar estado activo
  const rutasAnexos = [
    '/documentos',
    '/gestion',
    '/acervo',
    '/patrimonio',
    '/personal',
    '/nopatrimonial',
  ]
  const estaEnAnexo = rutasAnexos.some((r) => location.pathname.startsWith(r))
  const [anexosAbierto, setAnexosAbierto] = useState(true)

  const items = ITEMS_NAV.filter((item) => permisos.has(item.permiso))

  const nav = (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2 text-xs">
      {items.map((item) => {
        const Icono = item.icono

        // Si es un módulo contenedor con submódulos hijos (ej. "Anexos de Transferencia")
        if (item.hijos && item.hijos.length > 0) {
          const hijosPermitidos = item.hijos.filter((h) => permisos.has(h.permiso))
          if (hijosPermitidos.length === 0) return null

          return (
            <div key={item.etiqueta} className="space-y-1">
              <button
                type="button"
                onClick={() => setAnexosAbierto((prev) => !prev)}
                className={cn(
                  'w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-all duration-150',
                  estaEnAnexo
                    ? 'bg-white/20 text-white font-semibold'
                    : 'text-white/80 hover:bg-white/10 hover:text-white',
                )}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icono className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.etiqueta}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-white/20 text-white rounded-full">
                    {hijosPermitidos.length}
                  </span>
                  {anexosAbierto ? (
                    <ChevronDown className="h-3.5 w-3.5 text-white/80" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-white/80" />
                  )}
                </div>
              </button>

              {anexosAbierto && (
                <div className="border-l border-white/20 ml-4 pl-2 space-y-1 pt-0.5 pb-1">
                  {hijosPermitidos.map((sub) => {
                    const SubIcono = sub.icono
                    return (
                      <NavLink
                        key={sub.ruta}
                        to={sub.ruta}
                        onClick={() => setMenuAbierto(false)}
                        className={({ isActive }) =>
                          cn(
                            'flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-150',
                            isActive
                              ? 'bg-white text-[#3484A5] font-semibold shadow-sm'
                              : 'text-white/80 hover:bg-white/10 hover:text-white',
                          )
                        }
                      >
                        <SubIcono className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{sub.etiqueta}</span>
                      </NavLink>
                    )
                  })}
                </div>
              )}
            </div>
          )
        }

        // Ítem regular directo
        return (
          <NavLink
            key={item.ruta}
            to={item.ruta!}
            end={item.ruta === '/'}
            onClick={() => setMenuAbierto(false)}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-150',
                isActive
                  ? 'bg-white text-[#3484A5] font-semibold shadow-sm'
                  : 'text-white/80 hover:bg-white/10 hover:text-white',
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
      {/* Barra lateral de navegación (Sidebar desktop) con color institucional #3484A5 */}
      <aside className="hidden w-64 shrink-0 flex-col bg-[#3484A5] text-white shadow-sm md:flex">
        {/* Encabezado con Escudo Blanco Oficial */}
        <div className="flex h-16 items-center gap-2.5 border-b border-white/15 px-4">
          <img
            src="/brand/escudo-blanco.png"
            alt="Escudo de San Jerónimo"
            className="h-9 w-9 object-contain shrink-0"
          />
          <div className="min-w-0">
            <span className="block text-xs font-semibold leading-tight text-white truncate">
              Muni San Jerónimo
            </span>
            <span className="block text-[10px] text-white/75 leading-tight truncate">
              Sistema de Transferencia
            </span>
          </div>
        </div>

        {/* Lista de navegación */}
        {nav}

        {/* Pie institucional */}
        <div className="border-t border-white/15 p-3 text-[11px] text-white/70 flex items-center justify-between">
          <span>Gestión 2023 - 2026</span>
          <span className="font-medium text-white/85">Elaborado por OTI</span>
        </div>
      </aside>

      {/* Barra lateral móvil (Sidebar móvil overlay) */}
      {menuAbierto && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setMenuAbierto(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col bg-[#3484A5] text-white shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-white/15 px-4">
              <div className="flex items-center gap-2.5">
                <img
                  src="/brand/escudo-blanco.png"
                  alt="Escudo de San Jerónimo"
                  className="h-8 w-8 object-contain shrink-0"
                />
                <div>
                  <div className="text-xs font-semibold text-white leading-tight">
                    Muni San Jerónimo
                  </div>
                  <div className="text-[10px] text-white/75 leading-tight">
                    Sistema de Transferencia
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/15 hover:text-white"
                onClick={() => setMenuAbierto(false)}
                aria-label="Cerrar menú"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            {nav}
            <div className="border-t border-white/15 p-3 text-[11px] text-white/70 flex items-center justify-between">
              <span>Gestión 2023 - 2026</span>
              <span className="font-medium text-white/85">Elaborado por OTI</span>
            </div>
          </aside>
        </div>
      )}

      {/* Contenido principal y Topbar */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center gap-3 border-b border-border bg-white px-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
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
