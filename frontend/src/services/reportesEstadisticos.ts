import apiRequest from './api';
import type { ReporteEstadistico } from '../types/reportesEstadisticos';

export async function obtenerReporteEstadistico(
  desde: string,
  hasta: string,
): Promise<ReporteEstadistico> {
  const consulta = new URLSearchParams();
  consulta.set('desde', desde);
  consulta.set('hasta', hasta);
  return apiRequest<ReporteEstadistico>(`/reportes/estadisticos?${consulta.toString()}`, {
    requiresAuth: true,
  });
}
