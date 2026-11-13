import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { Dialog } from '@/components/ui/dialog'
import { DataTable } from '@/components/ui/data-table'
import { documentosService } from './documentos.service'
import { nombreEstadoDocumento } from './estados-documentos'

interface Props {
  dependenciaId: number
  estado?: string
  onClose: () => void
}

export function DocumentosIndicadorModal({
  dependenciaId,
  estado,
  onClose,
}: Props) {
  const [pagina, setPagina] = useState(1)
  const filtros = {
    dependencia_id: dependenciaId,
    estado_atencion: estado,
    page: pagina,
    per_page: 10,
  }
  const consulta = useQuery({
    queryKey: ['documentos-indicador', filtros],
    queryFn: () => documentosService.listarIndicador(filtros),
  })

  return (
    <Dialog
      open
      onClose={onClose}
      title={estado ? `Documentos · ${nombreEstadoDocumento(estado)}` : 'Documentos pendientes de la oficina'}
      description={
        consulta.data
          ? `${consulta.data.total} documentos de la dependencia seleccionada.`
          : undefined
      }
    >
      <div className="max-h-[65vh] overflow-y-auto">
        <DataTable
          filas={consulta.data?.items}
          rowKey={(doc) => doc.id}
          loading={consulta.isLoading}
          error={consulta.error}
          onReintentar={() => void consulta.refetch()}
          vacio={{ titulo: 'Sin documentos para este indicador' }}
          meta={consulta.data}
          onPageChange={setPagina}
          columnas={[
            {
              id: 'numero',
              header: 'Documento',
              cell: (doc) => doc.numero_documento ?? 'Sin número',
            },
            {
              id: 'asunto',
              header: 'Asunto / sumilla',
              cell: (doc) => (
                <div className="min-w-40 whitespace-normal">
                  <p>{doc.asunto}</p>
                  {doc.sumilla && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {doc.sumilla}
                    </p>
                  )}
                </div>
              ),
            },
            {
              id: 'estado',
              header: 'Estado',
              cell: (doc) => nombreEstadoDocumento(doc.estado_atencion),
            },
            {
              id: 'original',
              header: 'Original SGD',
              cell: (doc) =>
                ({
                  disponible: 'Referencia disponible según permiso',
                  restringido: 'Acceso restringido',
                  no_aplica: 'Registro manual',
                })[doc.original_sgd],
            },
          ]}
        />
      </div>
    </Dialog>
  )
}
