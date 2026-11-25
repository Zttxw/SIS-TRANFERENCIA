import { CalendarRange, List } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { VistaAcervo } from './use-acervo'

const OPCIONES: { vista: VistaAcervo; etiqueta: string; Icono: typeof List }[] = [
  { vista: 'lista', etiqueta: 'Lista', Icono: List },
  { vista: 'anio', etiqueta: 'Por año', Icono: CalendarRange },
]

interface Props {
  vista: VistaAcervo
  onCambiar: (vista: VistaAcervo) => void
}

/** Alterna entre la lista paginada y los bloques por año del formato oficial. */
export function SelectorVistaAcervo({ vista, onCambiar }: Props) {
  return (
    <div className="flex items-center rounded-md border p-0.5">
      {OPCIONES.map(({ vista: opcion, etiqueta, Icono }) => (
        <Button
          key={opcion}
          type="button"
          variant={vista === opcion ? 'secondary' : 'ghost'}
          size="sm"
          className="h-7 gap-1.5 px-2.5"
          onClick={() => onCambiar(opcion)}
          aria-pressed={vista === opcion}
        >
          <Icono className="h-3.5 w-3.5" />
          {etiqueta}
        </Button>
      ))}
    </div>
  )
}
