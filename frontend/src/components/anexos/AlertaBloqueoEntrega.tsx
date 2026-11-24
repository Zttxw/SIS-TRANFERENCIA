import { CheckCircle, Lock, Send } from 'lucide-react'

import type { EstadoEntrega } from '@/types/transferencia'

interface AlertaBloqueoEntregaProps {
  estadoEntrega?: EstadoEntrega | null
  className?: string
}

const AVISOS: Record<Exclude<EstadoEntrega, 'borrador'>, { titulo: string; texto: string; icono: typeof Lock; clases: string }> = {
  en_revision: {
    titulo: 'Entrega en revisión y firma con el coordinador ETTE',
    texto:
      'Los anexos están bloqueados. Con el coordinador presente, registre lo que advierta como observación (constancia en el acta) y firmen ambos los anexos 02 al 07: su firma es la aprobación. No hay devolución para corregir.',
    icono: Lock,
    clases: 'border-info-border bg-info-soft text-info-fg',
  },
  acta_suscrita: {
    titulo: 'Acta suscrita por ambos lados',
    texto: 'Los anexos 02 al 07 tienen la firma del responsable y del coordinador ETTE. Corresponde remitir la entrega.',
    icono: CheckCircle,
    clases: 'border-success-border bg-success-soft text-success-fg',
  },
  remitida: {
    titulo: 'Entrega remitida (solo lectura)',
    texto: 'La entrega de este centro de costo ya fue remitida. Los anexos no pueden editarse.',
    icono: Send,
    clases: 'border-info-border bg-info-soft text-info-fg',
  },
  recibida_etts: {
    titulo: 'Entrega recibida por el ETTS (solo lectura)',
    texto: 'El ETTS registró la recepción de la entrega. Los anexos no pueden editarse.',
    icono: Send,
    clases: 'border-info-border bg-info-soft text-info-fg',
  },
  remitida_ette: {
    titulo: 'Entrega enviada al ETTE (solo lectura)',
    texto: 'El ETTS envió la entrega al ETTE. Los anexos no pueden editarse.',
    icono: Send,
    clases: 'border-info-border bg-info-soft text-info-fg',
  },
  recibida_ette: {
    titulo: 'Entrega recibida por el ETTE (solo lectura)',
    texto: 'El ETTE registró la recepción: el flujo de la entrega concluyó.',
    icono: CheckCircle,
    clases: 'border-success-border bg-success-soft text-success-fg',
  },
}

/** Aviso de por qué los anexos no se pueden editar (RN-13, D-07). */
export function AlertaBloqueoEntrega({ estadoEntrega, className = '' }: AlertaBloqueoEntregaProps) {
  if (!estadoEntrega || estadoEntrega === 'borrador') {
    return null
  }

  const { titulo, texto, icono: Icono, clases } = AVISOS[estadoEntrega]

  return (
    <div className={`flex items-start gap-3 rounded-lg border p-4 ${clases} ${className}`} role="alert">
      <Icono className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="space-y-1 text-sm">
        <p className="font-semibold">{titulo}</p>
        <p className="opacity-90">{texto}</p>
      </div>
    </div>
  )
}
