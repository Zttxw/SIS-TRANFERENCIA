import { useQuery } from '@tanstack/react-query'

import { reportesService } from './reportes.service'
import type { ReporteConciliacion, ReporteMatriz } from '@/types/reportes'

export function useMatrizAnexos() {
  return useQuery<ReporteMatriz>({
    queryKey: ['reportes', 'matriz-anexos'],
    queryFn: () => reportesService.obtener('matriz-anexos'),
  })
}

export function useConciliacionPatrimonial() {
  return useQuery<ReporteConciliacion>({
    queryKey: ['reportes', 'conciliacion-patrimonial'],
    queryFn: () => reportesService.obtener('conciliacion-patrimonial'),
  })
}
