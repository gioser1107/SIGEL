import apiRequest from './api';
import type { PaginacionQuery, RespuestaPaginada } from '../types/paginacion';
import { agregarPaginacionAParams, listarItemsParaSelect, normalizarRespuestaPaginada } from '../utils/paginacionApi';
import type { Cliente, DatosClienteEdicion, DatosClienteNuevo } from '../types/cliente';

export async function listarClientes(query?: PaginacionQuery): Promise<RespuestaPaginada<Cliente>> {
  const params = agregarPaginacionAParams(new URLSearchParams(), query);
  const data = await apiRequest<unknown>(`/clientes?${params.toString()}`, { requiresAuth: true });
  return normalizarRespuestaPaginada<Cliente>(data, query?.limite);
}

export async function listarClientesParaSelect(): Promise<Cliente[]> {
  return listarItemsParaSelect(listarClientes);
}

export async function obtenerCliente(clienteId: number): Promise<Cliente> {
  const res = await apiRequest<{ cliente: Cliente }>(`/clientes/${clienteId}`, {
    requiresAuth: true,
  });
  return res.cliente;
}

export async function crearCliente(datos: DatosClienteNuevo): Promise<Cliente> {
  const res = await apiRequest<{ mensaje: string; cliente: Cliente }>('/clientes/', {
    method: 'POST',
    requiresAuth: true,
    body: JSON.stringify(datos),
  });
  return res.cliente;
}

export async function editarCliente(
  clienteId: number,
  datos: DatosClienteEdicion
): Promise<Cliente> {
  const res = await apiRequest<{ mensaje: string; cliente: Cliente }>(`/clientes/${clienteId}`, {
    method: 'PUT',
    requiresAuth: true,
    body: JSON.stringify(datos),
  });
  return res.cliente;
}

export async function desactivarCliente(clienteId: number): Promise<void> {
  await apiRequest(`/clientes/${clienteId}`, {
    method: 'DELETE',
    requiresAuth: true,
  });
}

/** Busca un cliente registrado por documento (portal reserva / acompañantes). */
export async function buscarClientePorDocumento(
  tipo_documento: string,
  numero_documento: string,
): Promise<Cliente | null> {
  const doc = numero_documento.trim();
  if (!doc) return null;

  const params = new URLSearchParams({ tipo_documento, numero_documento: doc });
  const res = await apiRequest<{ cliente: Cliente | null }>(
    `/clientes/buscar-por-documento?${params}`,
    { requiresAuth: true },
  );
  return res.cliente ?? null;
}

export {
  listarPuntosRecogidaCliente,
  agregarPuntoRecogidaCliente,
  editarPuntoRecogidaCliente,
  marcarPuntoPredeterminadoCliente,
  quitarPuntoRecogidaCliente,
} from './puntos_recogida';
