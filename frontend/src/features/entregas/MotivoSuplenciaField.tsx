import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface MotivoSuplenciaFieldProps {
  id: string
  value: string
  onChange: (valor: string) => void
}

/** Motivo obligatorio cuando un titular ETTE suple al coordinador ausente. */
export function MotivoSuplenciaField({ id, value, onChange }: MotivoSuplenciaFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Motivo de la suplencia *</Label>
      <Textarea
        id={id}
        rows={2}
        maxLength={500}
        placeholder="Ej.: el coordinador ETTE está con descanso médico."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
      />
      <p className="text-nota text-muted-foreground">
        El titular ETTE firma en lugar del coordinador asignado; el motivo queda registrado en cada firma y observación.
      </p>
    </div>
  )
}
