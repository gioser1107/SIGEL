import apiRequest from './api';
import type { PaginacionQuery, RespuestaPaginada } from '../types/paginacion';
import { agregarPaginacionAParams, listarItemsParaSelect, normalizarRespuestaPaginada } from '../utils/paginacionApi';
import type { DatosUnidadActualizar, DatosUnidadCrear, UnidadTransporte } from '../types/unidad';

export async function obtenerUnidades(query?: PaginacionQuery): Promise<RespuestaPaginada<UnidadTransporte>> {
  const params = agregarPaginacionAParams(new URLSearchParams(), query);
  const data = await apiRequest<unknown>(`/unidades?${params.toString()}`, { requiresAuth: true });
  return normalizarRespuestaPaginada<UnidadTransporte>(data, query?.limite);
}

/** Catálogo completo de unidades activas para selects en formularios. */
export async function listarUnidadesParaSelect(): Promise<UnidadTransporte[]> {
  return listarItemsParaSelect(obtenerUnidades);
}

export async function obtenerUnidad(id: number): Promise<UnidadTransporte> {
  return apiRequest<UnidadTransporte>(`/unidades/${id}`, { requiresAuth: true });
}

export async function crearUnidad(datos: DatosUnidadCrear): Promise<{ mensaje: string; unidad_id: number }> {
  return apiRequest<{ mensaje: string; unidad_id: number }>('/unidades', {
    method: 'POST',
    requiresAuth: true,
    body: JSON.stringify(datos)
  });
}

export async function actualizarUnidad(id: number, datos: DatosUnidadActualizar): Promise<{ mensaje: string }> {
  return apiRequest<{ mensaje: string }>(`/unidades/${id}`, {
    method: 'PUT',
    requiresAuth: true,
    body: JSON.stringify(datos)
  });
}

export async function eliminarUnidad(id: number): Promise<{ mensaje: string }> {
  return apiRequest<{ mensaje: string }>(`/unidades/${id}`, {
    method: 'DELETE',
    requiresAuth: true
  });
}
