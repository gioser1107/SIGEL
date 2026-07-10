import apiRequest from './api';
import { apiMutacion } from '../utils/notificacionesEventos';
import type {
  AbordajeRegistro,
  EditarAbordajeDTO,
  ManifiestoAbordaje,
  MarcarAbordajeDTO,
  RegistrarLoteDTO,
  ResumenAbordaje,
  ViajeSelectorAbordaje,
} from '../types/abordaje';

export interface FiltrosViajesAbordaje {
  solo_hoy?: boolean;
  estado?: string;
}

export async function listarViajesAbordaje(
  filtros?: FiltrosViajesAbordaje,
): Promise<ViajeSelectorAbordaje[]> {
  const params = new URLSearchParams();
  if (filtros?.solo_hoy !== undefined) {
    params.set('solo_hoy', filtros.solo_hoy ? 'true' : 'false');
  }
  if (filtros?.estado) params.set('estado', filtros.estado);
  const qs = params.toString();
  return apiRequest<ViajeSelectorAbordaje[]>(
    `/abordajes/viajes${qs ? `?${qs}` : ''}`,
    { requiresAuth: true },
  );
}

export async function obtenerManifiestoAbordaje(viajeId: number): Promise<ManifiestoAbordaje> {
  return apiRequest<ManifiestoAbordaje>(`/abordajes/viajes/${viajeId}/manifiesto`, {
    requiresAuth: true,
  });
}

export async function obtenerResumenAbordaje(viajeId: number): Promise<ResumenAbordaje> {
  return apiRequest<ResumenAbordaje>(`/abordajes/viajes/${viajeId}/resumen`, {
    requiresAuth: true,
  });
}

export async function marcarAbordajePasajero(
  viajeId: number,
  reservaClienteId: number,
  datos: MarcarAbordajeDTO,
): Promise<AbordajeRegistro> {
  return apiMutacion(() =>
    apiRequest<AbordajeRegistro>(
      `/abordajes/viajes/${viajeId}/pasajeros/${reservaClienteId}`,
      {
        method: 'PUT',
        requiresAuth: true,
        body: JSON.stringify(datos),
      },
    ),
  );
}

export async function registrarAbordajeLote(
  viajeId: number,
  datos: RegistrarLoteDTO,
): Promise<{ mensaje?: string }> {
  return apiMutacion(() =>
    apiRequest<{ mensaje?: string }>(`/abordajes/viajes/${viajeId}/registrar-lote`, {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify(datos),
    }),
  );
}

export async function obtenerAbordaje(abordajeId: number): Promise<AbordajeRegistro> {
  return apiRequest<AbordajeRegistro>(`/abordajes/${abordajeId}`, { requiresAuth: true });
}

export async function editarAbordaje(
  abordajeId: number,
  datos: EditarAbordajeDTO,
): Promise<AbordajeRegistro> {
  return apiMutacion(() =>
    apiRequest<AbordajeRegistro>(`/abordajes/${abordajeId}`, {
      method: 'PUT',
      requiresAuth: true,
      body: JSON.stringify(datos),
    }),
  );
}

export async function anularAbordaje(abordajeId: number): Promise<{ mensaje?: string }> {
  return apiMutacion(() =>
    apiRequest<{ mensaje?: string }>(`/abordajes/${abordajeId}`, {
      method: 'DELETE',
      requiresAuth: true,
    }),
  );
}
