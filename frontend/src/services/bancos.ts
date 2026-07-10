import apiRequest from './api';
import { apiMutacion } from '../utils/notificacionesEventos';
import type { PaginacionQuery, RespuestaPaginada } from '../types/paginacion';
import { agregarPaginacionAParams, listarItemsParaSelect, normalizarRespuestaPaginada } from '../utils/paginacionApi';
import type { Banco, CrearBancoDTO, EditarBancoDTO } from '../types/pagos';

export async function listarBancos(query?: PaginacionQuery): Promise<RespuestaPaginada<Banco>> {
  const params = agregarPaginacionAParams(new URLSearchParams(), query);
  const data = await apiRequest<unknown>(`/bancos?${params.toString()}`, { requiresAuth: true });
  return normalizarRespuestaPaginada<Banco>(data, query?.limite);
}

export async function listarBancosParaSelect(): Promise<Banco[]> {
  return listarItemsParaSelect(listarBancos);
}

export async function obtenerBanco(id: number): Promise<Banco> {
  return apiRequest<Banco>(`/bancos/${id}`, { requiresAuth: true });
}

export async function crearBanco(datos: CrearBancoDTO): Promise<Banco> {
  return apiMutacion(() =>
    apiRequest<Banco>('/bancos', {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify(datos),
    })
  );
}

export async function editarBanco(id: number, datos: EditarBancoDTO): Promise<Banco> {
  return apiMutacion(() =>
    apiRequest<Banco>(`/bancos/${id}`, {
      method: 'PUT',
      requiresAuth: true,
      body: JSON.stringify(datos),
    })
  );
}

export async function eliminarBanco(id: number): Promise<{ mensaje: string }> {
  return apiMutacion(() =>
    apiRequest<{ mensaje: string }>(`/bancos/${id}`, {
      method: 'DELETE',
      requiresAuth: true,
    })
  );
}
