import { Search } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

interface BarraBusquedaAnexoProps {
  busqueda: string
  onBuscar: (valor: string) => void
  placeholder?: string
  /** Controles de filtro extra a la derecha del buscador (p. ej. un Select). */
  filtrosExtra?: React.ReactNode
}

/** Buscador de las páginas de anexo, con espacio para filtros a la derecha. */
export function BarraBusquedaAnexo({ busqueda, onBuscar, placeholder = 'Buscar…', filtrosExtra }: BarraBusquedaAnexoProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={placeholder}
              value={busqueda}
              onChange={(e) => onBuscar(e.target.value)}
              className="pl-9"
            />
          </div>
          {filtrosExtra && <div className="flex flex-wrap items-center gap-2">{filtrosExtra}</div>}
        </div>
      </CardContent>
    </Card>
  )
}
