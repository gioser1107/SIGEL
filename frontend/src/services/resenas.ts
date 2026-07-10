import apiRequest from './api';
import type { DatosCrearResena, Resena, ReservaElegibleResena } from '../types/resenas';

export async function obtenerResenasPublicas(): Promise<Resena[]> {
  return apiRequest<Resena[]>('/resenas/publicas');
}

export async function obtenerMisReservasElegibles(): Promise<ReservaElegibleResena[]> {
  return apiRequest<ReservaElegibleResena[]>('/resenas/mis-reservas-elegibles', { requiresAuth: true });
}

export async function obtenerMiResena(reservaId: number): Promise<Resena | null> {
  return apiRequest<Resena | null>(`/resenas/mi-resena?reserva_id=${reservaId}`, { requiresAuth: true });
}

export async function crearResena(datos: DatosCrearResena): Promise<{ mensaje: string; resena: Resena }> {
  return apiRequest<{ mensaje: string; resena: Resena }>('/resenas', {
    method: 'POST',
    requiresAuth: true,
    body: JSON.stringify(datos),
  });
}

export async function listarResenasAdmin(): Promise<Resena[]> {
  return apiRequest<Resena[]>('/resenas', { requiresAuth: true });
}

export async function alternarVisibilidadResena(id: number): Promise<{ mensaje: string; resena: Resena }> {
  return apiRequest<{ mensaje: string; resena: Resena }>(`/resenas/${id}/visibilidad`, {
    method: 'PATCH',
    requiresAuth: true,
  });
}

export async function eliminarResena(id: number): Promise<{ mensaje: string }> {
  return apiRequest<{ mensaje: string }>(`/resenas/${id}`, {
    method: 'DELETE',
    requiresAuth: true,
  });
}
