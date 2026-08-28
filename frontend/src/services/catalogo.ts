/**
 * catalogo.ts — Catálogo público (destinos y viajes sin autenticación).
 */

import apiRequest from './api';
import { resolverUrlArchivo } from '../utils/resolverUrlArchivo';
import type { ViajeAgenda } from '../types/viaje';

export interface DestinoImagen {
  id: number;
  url: string;
  orden: number;
  es_portada: boolean;
}

export interface DestinoCatalogo {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio_base_eur: number | null;
  imagen: string;
  activo: boolean;
  imagenes?: DestinoImagen[];
}

export interface EstadisticasCatalogo {
  destinos_activos: number;
  viajes_proximos: number;
}

export interface ViajeCatalogo extends ViajeAgenda {
  destino_id: number;
  fecha: string;
  fecha_salida: string;
  fecha_regreso: string | null;
  estado: string;
  unidad_placa: string | null;
  paradas: {
    orden: number;
    nombre: string;
    hora_programada: string | null;
  }[];
}

function normalizarDestinoCatalogo(destino: DestinoCatalogo): DestinoCatalogo {
  return {
    ...destino,
    imagen: resolverUrlArchivo(destino.imagen),
    imagenes: destino.imagenes?.map((img) => ({
      ...img,
      url: resolverUrlArchivo(img.url),
    })),
  };
}

export async function obtenerEstadisticasCatalogo(): Promise<EstadisticasCatalogo> {
  return apiRequest<EstadisticasCatalogo>('/catalogo/estadisticas');
}

export async function obtenerDestinosCatalogo(): Promise<DestinoCatalogo[]> {
  const lista = await apiRequest<DestinoCatalogo[]>('/catalogo/destinos');
  return lista.map(normalizarDestinoCatalogo);
}

export async function obtenerDestinoCatalogo(id: number): Promise<DestinoCatalogo> {
  const destino = await apiRequest<DestinoCatalogo>(`/catalogo/destinos/${id}`);
  return normalizarDestinoCatalogo(destino);
}

export async function obtenerViajesCatalogo(params?: {
  destino_id?: number;
  mes?: string;
}): Promise<ViajeCatalogo[]> {
  const consulta = new URLSearchParams();
  if (params?.destino_id) consulta.set('destino_id', String(params.destino_id));
  if (params?.mes) consulta.set('mes', params.mes);
  const sufijo = consulta.toString() ? `?${consulta.toString()}` : '';
  return apiRequest<ViajeCatalogo[]>(`/catalogo/viajes${sufijo}`);
}

export async function obtenerViajeCatalogo(id: number): Promise<ViajeCatalogo> {
  return apiRequest<ViajeCatalogo>(`/catalogo/viajes/${id}`);
}

/** Agrupa viajes del catálogo por fecha YYYY-MM-DD para la agenda */
export function agruparViajesPorFecha(viajes: ViajeCatalogo[]): Record<string, ViajeCatalogo[]> {
  return viajes.reduce<Record<string, ViajeCatalogo[]>>((acc, viaje) => {
    const clave = viaje.fecha;
    if (!acc[clave]) acc[clave] = [];
    acc[clave].push(viaje);
    return acc;
  }, {});
}

/** Convierte destino del catálogo al formato de tarjeta de viaje */
export function destinoComoViaje(destino: DestinoCatalogo): ViajeAgenda {
  return {
    id: destino.id,
    titulo: destino.nombre,
    ubicacion: destino.descripcion?.slice(0, 80) ?? 'Venezuela',
    precio: destino.precio_base_eur ?? 0,
    recargo_menor_eur: 0,
    imagen: destino.imagen,
    hora: 'Consultar',
    cupos: 0,
    duracion: 'Variable',
    dificultad: 'Moderado',
    descripcion: destino.descripcion ?? '',
  };
}
