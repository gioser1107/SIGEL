import apiRequest from './api';
import { apiMutacion } from '../utils/notificacionesEventos';
import type { PaginacionQuery, RespuestaPaginada } from '../types/paginacion';
import { agregarPaginacionAParams, normalizarRespuestaPaginada } from '../utils/paginacionApi';
import type {
  ActualizarPagoDTO,
  CatalogoPagos,
  CrearPagoDTO,
  FiltrosPagosGlobal,
  PagoGlobal,
  PagoReserva,
  ResumenPagosReserva,
} from '../types/pagos';

export async function obtenerCatalogoPagos(): Promise<CatalogoPagos> {
  return apiRequest<CatalogoPagos>('/pagos/catalogo', { requiresAuth: true });
}

export async function obtenerResumenPagos(reservaId: number): Promise<ResumenPagosReserva> {
  return apiRequest<ResumenPagosReserva>(`/reservas/${reservaId}/pagos/resumen`, {
    requiresAuth: true,
  });
}

export async function listarPagosReserva(
  reservaId: number,
  query?: PaginacionQuery,
): Promise<RespuestaPaginada<PagoReserva>> {
  const params = agregarPaginacionAParams(new URLSearchParams(), query);
  const data = await apiRequest<unknown>(
    `/reservas/${reservaId}/pagos?${params.toString()}`,
    { requiresAuth: true },
  );
  return normalizarRespuestaPaginada<PagoReserva>(data, query?.limite);
}

export async function obtenerPagoReserva(
  reservaId: number,
  pagoId: number,
): Promise<PagoReserva> {
  return apiRequest<PagoReserva>(`/reservas/${reservaId}/pagos/${pagoId}`, { requiresAuth: true });
}

export async function registrarPagoReserva(
  reservaId: number,
  datos: CrearPagoDTO
): Promise<{ mensaje: string; pago: PagoReserva }> {
  return apiMutacion(() =>
    apiRequest<{ mensaje: string; pago: PagoReserva }>(`/reservas/${reservaId}/pagos`, {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify(datos),
    })
  );
}

export async function listarPagosGlobal(
  filtros?: FiltrosPagosGlobal,
): Promise<RespuestaPaginada<PagoGlobal>> {
  const params = new URLSearchParams();
  if (filtros?.reserva_id) params.set('reserva_id', String(filtros.reserva_id));
  if (filtros?.estado) params.set('estado', filtros.estado);
  if (filtros?.metodo_pago_id) params.set('metodo_pago_id', String(filtros.metodo_pago_id));
  if (filtros?.fecha_desde) params.set('fecha_desde', filtros.fecha_desde);
  if (filtros?.fecha_hasta) params.set('fecha_hasta', filtros.fecha_hasta);
  agregarPaginacionAParams(params, filtros);
  const data = await apiRequest<unknown>(`/pagos?${params.toString()}`, { requiresAuth: true });
  return normalizarRespuestaPaginada<PagoGlobal>(data, filtros?.limite);
}

export async function actualizarPagoReserva(
  reservaId: number,
  pagoId: number,
  datos: ActualizarPagoDTO
): Promise<{ mensaje: string; pago: PagoReserva }> {
  return apiMutacion(() =>
    apiRequest<{ mensaje: string; pago: PagoReserva }>(
      `/reservas/${reservaId}/pagos/${pagoId}`,
      {
        method: 'PUT',
        requiresAuth: true,
        body: JSON.stringify(datos),
      }
    )
  );
}

export async function aprobarPagoReserva(
  reservaId: number,
  pagoId: number,
): Promise<{ mensaje: string; pago: PagoReserva }> {
  return apiMutacion(() =>
    apiRequest<{ mensaje: string; pago: PagoReserva }>(
      `/reservas/${reservaId}/pagos/${pagoId}/aprobar`,
      { method: 'POST', requiresAuth: true },
    ),
  );
}

export async function eliminarPagoReserva(
  reservaId: number,
  pagoId: number
): Promise<{ mensaje: string }> {
  return apiMutacion(() =>
    apiRequest<{ mensaje: string }>(`/reservas/${reservaId}/pagos/${pagoId}`, {
      method: 'DELETE',
      requiresAuth: true,
    })
  );
}
