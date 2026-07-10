import apiRequest from './api';
import type { Asiento, CrearAsientoDTO, ActualizarAsientoDTO } from '../types/asiento';

export async function obtenerAsientos(params?: { unidad_id?: number }): Promise<Asiento[]> {
  const queryStr = params?.unidad_id ? `?unidad_id=${params.unidad_id}` : '';
  return apiRequest<Asiento[]>(`/asientos${queryStr}`, {
    requiresAuth: true,
  });
}

export async function crearAsiento(datos: CrearAsientoDTO): Promise<{ mensaje: string; asiento_id: number }> {
  return apiRequest<{ mensaje: string; asiento_id: number }>('/asientos', {
    method: 'POST',
    requiresAuth: true,
    body: JSON.stringify(datos),
  });
}

export async function actualizarAsiento(id: number, datos: ActualizarAsientoDTO): Promise<{ mensaje: string }> {
  return apiRequest<{ mensaje: string }>(`/asientos/${id}`, {
    method: 'PUT',
    requiresAuth: true,
    body: JSON.stringify(datos),
  });
}

export async function eliminarAsiento(id: number): Promise<{ mensaje: string }> {
  return apiRequest<{ mensaje: string }>(`/asientos/${id}`, {
    method: 'DELETE',
    requiresAuth: true,
  });
}
