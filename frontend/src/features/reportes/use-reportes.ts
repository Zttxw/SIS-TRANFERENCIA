import { useQuery } from '@tanstack/react-query'

import { reportesService } from './reportes.service'
import type {
  ReporteConciliacion,
  ReporteMatriz,
  ReporteObservaciones,
} from '@/types/reportes'

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

export function useObservacionesReporte() {
  return useQuery<ReporteObservaciones>({
    queryKey: ['reportes', 'observaciones'],
    queryFn: () => reportesService.obtener('observaciones'),
  })
}
