import apiRequest from './api';
import { apiMutacion } from '../utils/notificacionesEventos';
import type { PaginacionQuery, RespuestaPaginada } from '../types/paginacion';
import { agregarPaginacionAParams, listarItemsParaSelect, normalizarRespuestaPaginada } from '../utils/paginacionApi';
import type { CrearMetodoPagoDTO, EditarMetodoPagoDTO, MetodoPago } from '../types/pagos';

export async function listarMetodosPago(query?: PaginacionQuery): Promise<RespuestaPaginada<MetodoPago>> {
  const params = agregarPaginacionAParams(new URLSearchParams(), query);
  const data = await apiRequest<unknown>(`/metodos-pago?${params.toString()}`, { requiresAuth: true });
  return normalizarRespuestaPaginada<MetodoPago>(data, query?.limite);
}

export async function listarMetodosPagoParaSelect(): Promise<MetodoPago[]> {
  return listarItemsParaSelect(listarMetodosPago);
}

export async function obtenerMetodoPago(id: number): Promise<MetodoPago> {
  return apiRequest<MetodoPago>(`/metodos-pago/${id}`, { requiresAuth: true });
}

export async function crearMetodoPago(datos: CrearMetodoPagoDTO): Promise<MetodoPago> {
  return apiMutacion(() =>
    apiRequest<MetodoPago>('/metodos-pago', {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify(datos),
    })
  );
}

export async function editarMetodoPago(id: number, datos: EditarMetodoPagoDTO): Promise<MetodoPago> {
  return apiMutacion(() =>
    apiRequest<MetodoPago>(`/metodos-pago/${id}`, {
      method: 'PUT',
      requiresAuth: true,
      body: JSON.stringify(datos),
    })
  );
}

export async function eliminarMetodoPago(id: number): Promise<{ mensaje: string }> {
  return apiMutacion(() =>
    apiRequest<{ mensaje: string }>(`/metodos-pago/${id}`, {
      method: 'DELETE',
      requiresAuth: true,
    })
  );
}
