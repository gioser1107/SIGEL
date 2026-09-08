/**
 * destinos.ts — Gestión administrativa de destinos turísticos.
 */

import apiRequest, { apiSubirArchivo } from './api';
import { resolverUrlArchivo } from '../utils/resolverUrlArchivo';
import type { FiltroListado, PaginacionQuery, RespuestaPaginada } from '../types/paginacion';
import { agregarPaginacionAParams, listarItemsParaSelect, normalizarRespuestaPaginada } from '../utils/paginacionApi';
import type {
  DatosDestinoActualizar,
  DatosDestinoNuevo,
  DatosImagenDestinoActualizar,
  Destino,
  DestinoImagen,
} from '../types/destino';

function normalizarDestino(destino: Destino): Destino {
  return {
    ...destino,
    imagen: destino.imagen ? resolverUrlArchivo(destino.imagen) : destino.imagen,
    imagenes: destino.imagenes?.map((img) => ({
      ...img,
      url: resolverUrlArchivo(img.url),
    })),
  };
}

function normalizarImagen(imagen: DestinoImagen): DestinoImagen {
  return { ...imagen, url: resolverUrlArchivo(imagen.url) };
}

export async function obtenerDestinos(
  query?: PaginacionQuery & { filtro?: FiltroListado },
): Promise<RespuestaPaginada<Destino>> {
  const params = agregarPaginacionAParams(new URLSearchParams(), query);
  const data = await apiRequest<unknown>(`/destinos?${params.toString()}`, { requiresAuth: true });
  const respuesta = normalizarRespuestaPaginada<Destino>(data, query?.limite);
  return { ...respuesta, items: respuesta.items.map(normalizarDestino) };
}

/** Catálogo completo de destinos activos para selects en formularios. */
export async function listarDestinosParaSelect(): Promise<Destino[]> {
  return listarItemsParaSelect((query) => obtenerDestinos({ ...query, filtro: 'activo' }));
}

export async function obtenerDestinoPorId(id: number): Promise<Destino> {
  const respuesta = await apiRequest<{ destino: Destino }>(`/destinos/${id}`, {
    requiresAuth: true,
  });
  return normalizarDestino(respuesta.destino);
}

export async function crearDestino(
  datos: DatosDestinoNuevo,
): Promise<{ mensaje: string; destino: Destino }> {
  const respuesta = await apiRequest<{ mensaje: string; destino: Destino }>('/destinos', {
    method: 'POST',
    requiresAuth: true,
    body: JSON.stringify(datos),
  });
  return { ...respuesta, destino: normalizarDestino(respuesta.destino) };
}

export async function actualizarDestino(
  id: number,
  datos: DatosDestinoActualizar,
): Promise<{ mensaje: string; destino: Destino }> {
  const respuesta = await apiRequest<{ mensaje: string; destino: Destino }>(`/destinos/${id}`, {
    method: 'PUT',
    requiresAuth: true,
    body: JSON.stringify(datos),
  });
  return { ...respuesta, destino: normalizarDestino(respuesta.destino) };
}

export async function anularDestino(id: number): Promise<{ mensaje: string; destino_id: number }> {
  return apiRequest<{ mensaje: string; destino_id: number }>(`/destinos/${id}`, {
    method: 'DELETE',
    requiresAuth: true,
  });
}

export async function obtenerImagenesDestino(destinoId: number): Promise<DestinoImagen[]> {
  const respuesta = await apiRequest<{ imagenes: DestinoImagen[] }>(
    `/destinos/${destinoId}/imagenes`,
    { requiresAuth: true },
  );
  return respuesta.imagenes.map(normalizarImagen);
}

export async function subirImagenDestino(
  destinoId: number,
  archivo: File,
  esPortada = false,
): Promise<{ mensaje: string; imagen: DestinoImagen }> {
  const respuesta = await apiSubirArchivo<{ mensaje: string; imagen: DestinoImagen }>(
    `/destinos/${destinoId}/imagenes/upload`,
    'archivo',
    archivo,
    { es_portada: esPortada ? 'true' : 'false' },
    { requiresAuth: true },
  );
  return { ...respuesta, imagen: normalizarImagen(respuesta.imagen) };
}

export async function actualizarImagenDestino(
  destinoId: number,
  imagenId: number,
  datos: DatosImagenDestinoActualizar,
): Promise<{ mensaje: string; imagen: DestinoImagen }> {
  return apiRequest<{ mensaje: string; imagen: DestinoImagen }>(
    `/destinos/${destinoId}/imagenes/${imagenId}`,
    {
      method: 'PUT',
      requiresAuth: true,
      body: JSON.stringify(datos),
    },
  );
}

export async function quitarImagenDestino(
  destinoId: number,
  imagenId: number,
): Promise<{ mensaje: string; imagen_id: number }> {
  return apiRequest<{ mensaje: string; imagen_id: number }>(
    `/destinos/${destinoId}/imagenes/${imagenId}`,
    {
      method: 'DELETE',
      requiresAuth: true,
    },
  );
}
