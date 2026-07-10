import apiRequest from './api';
import { apiMutacion } from '../utils/notificacionesEventos';
import type { PaginacionQuery, RespuestaPaginada } from '../types/paginacion';
import { agregarPaginacionAParams, listarItemsParaSelect, normalizarRespuestaPaginada } from '../utils/paginacionApi';
import type { CrearTasaDTO, EditarTasaDTO, TasaCambio, TasaDelDiaRespuesta } from '../types/pagos';

export interface FiltrosTasas extends PaginacionQuery {
  moneda_id?: number;
  fecha?: string;
}

export async function listarTasas(filtros?: FiltrosTasas): Promise<RespuestaPaginada<TasaCambio>> {
  const params = new URLSearchParams();
  if (filtros?.moneda_id) params.set('moneda_id', String(filtros.moneda_id));
  if (filtros?.fecha) params.set('fecha', filtros.fecha);
  agregarPaginacionAParams(params, filtros);
  const data = await apiRequest<unknown>(`/tasas?${params.toString()}`, { requiresAuth: true });
  return normalizarRespuestaPaginada<TasaCambio>(data, filtros?.limite);
}

export async function listarTasasHoy(query?: PaginacionQuery): Promise<RespuestaPaginada<TasaCambio>> {
  const params = agregarPaginacionAParams(new URLSearchParams(), query);
  const data = await apiRequest<unknown>(`/tasas/hoy?${params.toString()}`, { requiresAuth: true });
  return normalizarRespuestaPaginada<TasaCambio>(data, query?.limite);
}

export async function listarTasasHoyParaSelect(): Promise<TasaCambio[]> {
  return listarItemsParaSelect(listarTasasHoy);
}

export async function obtenerTasaDelDia(): Promise<TasaDelDiaRespuesta> {
  return apiRequest<TasaDelDiaRespuesta>('/tasas/del-dia', { requiresAuth: true });
}

export async function obtenerTasa(id: number): Promise<TasaCambio> {
  return apiRequest<TasaCambio>(`/tasas/${id}`, { requiresAuth: true });
}

export async function crearTasa(datos: CrearTasaDTO): Promise<TasaCambio> {
  return apiMutacion(() =>
    apiRequest<TasaCambio>('/tasas', {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify(datos),
    })
  );
}

export async function editarTasa(id: number, datos: EditarTasaDTO): Promise<TasaCambio> {
  return apiMutacion(() =>
    apiRequest<TasaCambio>(`/tasas/${id}`, {
      method: 'PUT',
      requiresAuth: true,
      body: JSON.stringify(datos),
    })
  );
}

export async function eliminarTasa(id: number): Promise<{ mensaje: string }> {
  return apiMutacion(() =>
    apiRequest<{ mensaje: string }>(`/tasas/${id}`, {
      method: 'DELETE',
      requiresAuth: true,
    })
  );
}
