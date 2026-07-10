/**
 * viajes.ts — Planificación logística (módulo 11).
 */

import apiRequest from './api';
import type { RespuestaPaginada } from '../types/paginacion';
import { agregarPaginacionAParams, normalizarRespuestaPaginada } from '../utils/paginacionApi';
import type {
  Costo,
  DatosCostoActualizar,
  DatosCostoNuevo,
  DatosParadaActualizar,
  DatosParadaNueva,
  DatosViajeNuevo,
  GuardarRutaRecogidaDTO,
  GuiaDisponible,
  GuiaViaje,
  Parada,
  ParadaRutaRecogida,
  RespuestaAsientosViaje,
  RespuestaCandidatosRutaRecogida,
  ResumenCostos,
  Viaje,
} from '../types/viaje';
import type { ReporteViaje } from '../types/viajeReporte';

export async function obtenerGuiasDisponibles(): Promise<GuiaDisponible[]> {
  return apiRequest<GuiaDisponible[]>('/viajes/guias-disponibles', { requiresAuth: true });
}

export async function obtenerGuiasViaje(viajeId: number): Promise<GuiaViaje[]> {
  return apiRequest<GuiaViaje[]>(`/viajes/${viajeId}/guias`, { requiresAuth: true });
}

export interface ActualizarGuiasViajeDTO {
  guias_ids: number[];
  guia_principal_id?: number | null;
}

export async function actualizarGuiasViaje(
  viajeId: number,
  datos: ActualizarGuiasViajeDTO,
): Promise<{ mensaje: string; guias: GuiaViaje[] }> {
  return apiRequest<{ mensaje: string; guias: GuiaViaje[] }>(`/viajes/${viajeId}/guias`, {
    method: 'PUT',
    body: JSON.stringify(datos),
    requiresAuth: true,
  });
}

export async function obtenerViajes(params?: {
  estado?: string;
  filtro?: string;
  destino_id?: number;
  pagina?: number;
  limite?: number;
}): Promise<RespuestaPaginada<Viaje>> {
  const consulta = new URLSearchParams();
  if (params?.filtro) consulta.set('filtro', params.filtro);
  else if (params?.estado) consulta.set('estado', params.estado);
  if (params?.destino_id) consulta.set('destino_id', String(params.destino_id));
  agregarPaginacionAParams(consulta, params);
  const data = await apiRequest<unknown>(`/viajes?${consulta.toString()}`, { requiresAuth: true });
  return normalizarRespuestaPaginada<Viaje>(data, params?.limite);
}

export async function obtenerViajePorId(id: number): Promise<Viaje> {
  return apiRequest<Viaje>(`/viajes/${id}`, { requiresAuth: true });
}

export async function obtenerReporteViaje(viajeId: number): Promise<ReporteViaje> {
  return apiRequest<ReporteViaje>(`/viajes/${viajeId}/reporte`, { requiresAuth: true });
}

export async function crearViaje(datos: DatosViajeNuevo): Promise<{ mensaje: string; viaje: Viaje }> {
  return apiRequest<{ mensaje: string; viaje: Viaje }>('/viajes', {
    method: 'POST',
    body: JSON.stringify(datos),
    requiresAuth: true,
  });
}

export async function actualizarViaje(
  id: number,
  datos: Partial<DatosViajeNuevo>,
): Promise<{ mensaje: string; viaje: Viaje }> {
  return apiRequest<{ mensaje: string; viaje: Viaje }>(`/viajes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(datos),
    requiresAuth: true,
  });
}

export async function eliminarViaje(id: number): Promise<{ mensaje: string; viaje_id: number }> {
  return apiRequest<{ mensaje: string; viaje_id: number }>(`/viajes/${id}`, {
    method: 'DELETE',
    requiresAuth: true,
  });
}

/* ─── Paradas ─── */

export async function obtenerParadas(viajeId: number): Promise<Parada[]> {
  return apiRequest<Parada[]>(`/viajes/${viajeId}/paradas`, { requiresAuth: true });
}

export async function obtenerParadasPublicas(viajeId: number): Promise<Parada[]> {
  return apiRequest<Parada[]>(`/catalogo/viajes/${viajeId}/paradas`, { requiresAuth: false });
}

export async function crearParada(
  viajeId: number,
  datos: DatosParadaNueva,
): Promise<{ mensaje: string; parada: Parada }> {
  return apiRequest<{ mensaje: string; parada: Parada }>(`/viajes/${viajeId}/paradas`, {
    method: 'POST',
    body: JSON.stringify(datos),
    requiresAuth: true,
  });
}

export async function actualizarParada(
  viajeId: number,
  orden: number,
  datos: DatosParadaActualizar,
): Promise<{ mensaje: string; parada: Parada }> {
  return apiRequest<{ mensaje: string; parada: Parada }>(`/viajes/${viajeId}/paradas/${orden}`, {
    method: 'PUT',
    body: JSON.stringify(datos),
    requiresAuth: true,
  });
}

export async function eliminarParada(
  viajeId: number,
  orden: number,
): Promise<{ mensaje: string }> {
  return apiRequest<{ mensaje: string }>(`/viajes/${viajeId}/paradas/${orden}`, {
    method: 'DELETE',
    requiresAuth: true,
  });
}

/* ─── Ruta de recogida (viajeros) ─── */

export async function obtenerCandidatosRutaRecogida(
  viajeId: number,
): Promise<RespuestaCandidatosRutaRecogida> {
  return apiRequest<RespuestaCandidatosRutaRecogida>(
    `/viajes/${viajeId}/ruta-recogida/candidatos`,
    { requiresAuth: true },
  );
}

export async function obtenerRutaRecogida(viajeId: number): Promise<ParadaRutaRecogida[]> {
  const data = await apiRequest<ParadaRutaRecogida[] | { paradas: ParadaRutaRecogida[] }>(
    `/viajes/${viajeId}/ruta-recogida`,
    { requiresAuth: true },
  );
  return Array.isArray(data) ? data : data.paradas ?? [];
}

export async function guardarRutaRecogida(
  viajeId: number,
  body: GuardarRutaRecogidaDTO,
): Promise<{ mensaje: string }> {
  return apiRequest<{ mensaje: string }>(`/viajes/${viajeId}/ruta-recogida`, {
    method: 'PUT',
    body: JSON.stringify(body),
    requiresAuth: true,
  });
}

/* ─── Costos operativos ─── */

export async function obtenerCostos(viajeId: number): Promise<Costo[]> {
  return apiRequest<Costo[]>(`/viajes/${viajeId}/costos`, { requiresAuth: true });
}

export async function obtenerResumenCostos(viajeId: number): Promise<ResumenCostos> {
  return apiRequest<ResumenCostos>(`/viajes/${viajeId}/costos/resumen`, { requiresAuth: true });
}

export async function crearCosto(
  viajeId: number,
  datos: DatosCostoNuevo,
): Promise<{ mensaje: string; costo: Costo }> {
  return apiRequest<{ mensaje: string; costo: Costo }>(`/viajes/${viajeId}/costos`, {
    method: 'POST',
    body: JSON.stringify(datos),
    requiresAuth: true,
  });
}

export async function actualizarCosto(
  viajeId: number,
  costoId: number,
  datos: DatosCostoActualizar,
): Promise<{ mensaje: string; costo: Costo }> {
  return apiRequest<{ mensaje: string; costo: Costo }>(`/viajes/${viajeId}/costos/${costoId}`, {
    method: 'PUT',
    body: JSON.stringify(datos),
    requiresAuth: true,
  });
}

export async function eliminarCosto(
  viajeId: number,
  costoId: number,
): Promise<{ mensaje: string }> {
  return apiRequest<{ mensaje: string }>(`/viajes/${viajeId}/costos/${costoId}`, {
    method: 'DELETE',
    requiresAuth: true,
  });
}

/* ─── Asientos por Viaje ─── */

export async function obtenerAsientosDisponiblesPortal(
  viajeId: number,
): Promise<RespuestaAsientosViaje> {
  return apiRequest<RespuestaAsientosViaje>(
    `/viajes/${viajeId}/portal/asientos-disponibles`,
    { requiresAuth: true },
  );
}

export async function obtenerAsientosDisponibles(
  viajeId: number,
): Promise<RespuestaAsientosViaje> {
  return apiRequest<RespuestaAsientosViaje>(
    `/viajes/${viajeId}/asientos-disponibles`,
    { requiresAuth: true },
  );
}
