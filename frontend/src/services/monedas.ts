import apiRequest from './api';
import { apiMutacion } from '../utils/notificacionesEventos';
import type { PaginacionQuery, RespuestaPaginada } from '../types/paginacion';
import { agregarPaginacionAParams, listarItemsParaSelect, normalizarRespuestaPaginada } from '../utils/paginacionApi';
import type { CrearMonedaDTO, EditarMonedaDTO, Moneda } from '../types/pagos';

export async function listarMonedas(query?: PaginacionQuery): Promise<RespuestaPaginada<Moneda>> {
  const params = agregarPaginacionAParams(new URLSearchParams(), query);
  const data = await apiRequest<unknown>(`/monedas?${params.toString()}`, { requiresAuth: true });
  return normalizarRespuestaPaginada<Moneda>(data, query?.limite);
}

export async function listarMonedasParaSelect(): Promise<Moneda[]> {
  return listarItemsParaSelect(listarMonedas);
}

export async function obtenerMoneda(id: number): Promise<Moneda> {
  return apiRequest<Moneda>(`/monedas/${id}`, { requiresAuth: true });
}

export async function crearMoneda(datos: CrearMonedaDTO): Promise<Moneda> {
  return apiMutacion(() =>
    apiRequest<Moneda>('/monedas', {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify(datos),
    })
  );
}

export async function editarMoneda(id: number, datos: EditarMonedaDTO): Promise<Moneda> {
  return apiMutacion(() =>
    apiRequest<Moneda>(`/monedas/${id}`, {
      method: 'PUT',
      requiresAuth: true,
      body: JSON.stringify(datos),
    })
  );
}

export async function eliminarMoneda(id: number): Promise<{ mensaje: string }> {
  return apiMutacion(() =>
    apiRequest<{ mensaje: string }>(`/monedas/${id}`, {
      method: 'DELETE',
      requiresAuth: true,
    })
  );
}
