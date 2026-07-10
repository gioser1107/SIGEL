import apiRequest from './api';
import { apiMutacion } from '../utils/notificacionesEventos';
import type { PaginacionQuery, RespuestaPaginada } from '../types/paginacion';
import { agregarPaginacionAParams, normalizarRespuestaPaginada } from '../utils/paginacionApi';
import type { CrearPuntoVentaDTO, EditarPuntoVentaDTO, PuntoVenta } from '../types/pagos';

export interface FiltrosPuntosVenta extends PaginacionQuery {
  banco_id?: number;
}

export async function listarPuntosVenta(
  filtros?: FiltrosPuntosVenta,
): Promise<RespuestaPaginada<PuntoVenta>> {
  const params = new URLSearchParams();
  if (filtros?.banco_id) params.set('banco_id', String(filtros.banco_id));
  agregarPaginacionAParams(params, filtros);
  const data = await apiRequest<unknown>(`/puntos-venta?${params.toString()}`, { requiresAuth: true });
  return normalizarRespuestaPaginada<PuntoVenta>(data, filtros?.limite);
}

export async function obtenerPuntoVenta(id: number): Promise<PuntoVenta> {
  return apiRequest<PuntoVenta>(`/puntos-venta/${id}`, { requiresAuth: true });
}

export async function crearPuntoVenta(datos: CrearPuntoVentaDTO): Promise<PuntoVenta> {
  return apiMutacion(() =>
    apiRequest<PuntoVenta>('/puntos-venta', {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify(datos),
    })
  );
}

export async function editarPuntoVenta(id: number, datos: EditarPuntoVentaDTO): Promise<PuntoVenta> {
  return apiMutacion(() =>
    apiRequest<PuntoVenta>(`/puntos-venta/${id}`, {
      method: 'PUT',
      requiresAuth: true,
      body: JSON.stringify(datos),
    })
  );
}

export async function eliminarPuntoVenta(id: number): Promise<{ mensaje: string }> {
  return apiMutacion(() =>
    apiRequest<{ mensaje: string }>(`/puntos-venta/${id}`, {
      method: 'DELETE',
      requiresAuth: true,
    })
  );
}
