import apiRequest from './api';
import { apiMutacion } from '../utils/notificacionesEventos';
import type { RespuestaPaginada } from '../types/paginacion';
import { agregarPaginacionAParams, normalizarRespuestaPaginada } from '../utils/paginacionApi';
import type {
  Cotizacion,
  CotizacionLinea,
  DatosCotizacionNueva,
  DatosLineaCotizacionNueva,
  ResumenLineasCotizacion,
} from '../types/cotizacion';

export async function obtenerCotizaciones(params?: {
  estado?: string;
  filtro?: string;
  cliente_id?: number;
  pagina?: number;
  limite?: number;
}): Promise<RespuestaPaginada<Cotizacion>> {
  const consulta = new URLSearchParams();
  if (params?.filtro) consulta.set('filtro', params.filtro);
  else if (params?.estado) consulta.set('estado', params.estado);
  if (params?.cliente_id) consulta.set('cliente_id', String(params.cliente_id));
  agregarPaginacionAParams(consulta, params);
  const data = await apiRequest<unknown>(`/cotizaciones?${consulta.toString()}`, { requiresAuth: true });
  return normalizarRespuestaPaginada<Cotizacion>(data, params?.limite);
}

export async function obtenerCotizacionPorId(id: number): Promise<Cotizacion> {
  return apiRequest<Cotizacion>(`/cotizaciones/${id}`, { requiresAuth: true });
}

export async function crearCotizacion(
  datos: DatosCotizacionNueva,
): Promise<{ mensaje: string; cotizacion: Cotizacion }> {
  return apiMutacion(() =>
    apiRequest<{ mensaje: string; cotizacion: Cotizacion }>('/cotizaciones', {
      method: 'POST',
      body: JSON.stringify(datos),
      requiresAuth: true,
    }),
  );
}

export async function actualizarCotizacion(
  id: number,
  datos: Partial<DatosCotizacionNueva>,
): Promise<{ mensaje: string; cotizacion: Cotizacion }> {
  return apiMutacion(() =>
    apiRequest<{ mensaje: string; cotizacion: Cotizacion }>(`/cotizaciones/${id}`, {
      method: 'PUT',
      body: JSON.stringify(datos),
      requiresAuth: true,
    }),
  );
}

export async function eliminarCotizacion(
  id: number,
): Promise<{ mensaje: string; cotizacion_id: number }> {
  return apiMutacion(() =>
    apiRequest<{ mensaje: string; cotizacion_id: number }>(`/cotizaciones/${id}`, {
      method: 'DELETE',
      requiresAuth: true,
    }),
  );
}

export async function obtenerLineasCotizacion(cotizacionId: number): Promise<CotizacionLinea[]> {
  return apiRequest<CotizacionLinea[]>(`/cotizaciones/${cotizacionId}/lineas`, { requiresAuth: true });
}

export async function obtenerResumenLineasCotizacion(cotizacionId: number): Promise<ResumenLineasCotizacion> {
  return apiRequest<ResumenLineasCotizacion>(`/cotizaciones/${cotizacionId}/lineas/resumen`, { requiresAuth: true });
}

export async function crearLineaCotizacion(cotizacionId: number, datos: DatosLineaCotizacionNueva) {
  return apiRequest<{ mensaje: string; linea: CotizacionLinea; cotizacion: Cotizacion }>(
    `/cotizaciones/${cotizacionId}/lineas`,
    { method: 'POST', body: JSON.stringify(datos), requiresAuth: true },
  );
}

export async function eliminarLineaCotizacion(cotizacionId: number, lineaId: number) {
  return apiRequest<{ mensaje: string; cotizacion: Cotizacion }>(
    `/cotizaciones/${cotizacionId}/lineas/${lineaId}`,
    { method: 'DELETE', requiresAuth: true },
  );
}
