/**
 * ubicaciones.ts — Estados y ciudades para formularios.
 */

import apiRequest from './api';
import type { CiudadUbicacion, EstadoUbicacion } from '../types/cliente';

export async function listarEstados(): Promise<EstadoUbicacion[]> {
  return apiRequest<EstadoUbicacion[]>('/ubicaciones/estados');
}

export async function listarCiudadesPorEstado(estadoId: number): Promise<{
  estado: EstadoUbicacion;
  ciudades: CiudadUbicacion[];
}> {
  return apiRequest(`/ubicaciones/estados/${estadoId}/ciudades`);
}
