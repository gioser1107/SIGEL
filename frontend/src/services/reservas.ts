import apiRequest from './api';
import { apiMutacion } from '../utils/notificacionesEventos';
import type { RespuestaPaginada } from '../types/paginacion';
import { agregarPaginacionAParams, normalizarRespuestaPaginada } from '../utils/paginacionApi';
import type { PuntoRecogidaInline } from '../types/puntoRecogida';
import type { TipoCliente } from '../types/cliente';
import type {
  Reserva,
  ReservaCliente,
  AsientoReservado,
  CrearReservaDTO,
  ActualizarReservaDTO,
  CrearPasajeroDTO,
  ActualizarPasajeroDTO,
  AsignarAsientoDTO,
  ViajeDisponibleReserva,
} from '../types/reservas';

// --- Reserva desde landing (cliente autenticado) ---

/** Acompañante enviado desde el portal público. El backend lo busca o crea en clientes. */
export interface PasajeroExtraPublicoDTO {
  tipo_cliente: TipoCliente;
  tipo_documento: string;
  numero_documento: string;
  nombre: string;
  apellido: string;
  razon_social?: string | null;
  telefono?: string;
  telefono_secundario?: string;
  direccion?: string;
  estado_id: number;
  ciudad_id: number;
  notas?: string;
  es_menor: boolean;
  punto_recogida_id?: number | null;
  puntos_recogida?: PuntoRecogidaInline[];
}

export interface CrearReservaClienteDTO {
  viaje_id: number;
  titular_punto_recogida_id?: number | null;
  titular_puntos_recogida?: PuntoRecogidaInline[];
  pasajeros_extra?: PasajeroExtraPublicoDTO[];
  asientos_ids?: number[];
}

export async function crearReservaCliente(
  datos: CrearReservaClienteDTO,
): Promise<{ mensaje: string; reserva_id: number }> {
  return apiMutacion(() =>
    apiRequest<{ mensaje: string; reserva_id: number }>('/reservas/cliente', {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify(datos),
    }),
  );
}

export async function asignarAsientosReservaPortal(
  reservaId: number,
  asientosIds: number[],
): Promise<{ mensaje: string; asientos: number[] }> {
  return apiMutacion(() =>
    apiRequest<{ mensaje: string; asientos: number[] }>(
      `/reservas/${reservaId}/portal/asientos`,
      {
        method: 'POST',
        requiresAuth: true,
        body: JSON.stringify({ asientos_ids: asientosIds }),
      },
    ),
  );
}

// --- Reservas Principales ---

/** Viajes reservables (filtrados en backend). Permiso: leer_reservas. */
export async function obtenerViajesDisponiblesReserva(): Promise<ViajeDisponibleReserva[]> {
  return apiRequest<ViajeDisponibleReserva[]>('/reservas/viajes-disponibles', { requiresAuth: true });
}

export async function obtenerReservas(params?: {
  viaje_id?: number;
  cliente_id?: number;
  estado?: string;
  filtro?: string;
  pagina?: number;
  limite?: number;
}): Promise<RespuestaPaginada<Reserva>> {
  const searchParams = new URLSearchParams();
  if (params?.viaje_id) searchParams.append('viaje_id', String(params.viaje_id));
  if (params?.cliente_id) searchParams.append('cliente_id', String(params.cliente_id));
  if (params?.filtro) searchParams.append('filtro', params.filtro);
  else if (params?.estado) searchParams.append('estado', params.estado);
  agregarPaginacionAParams(searchParams, params);
  const data = await apiRequest<unknown>(`/reservas?${searchParams.toString()}`, { requiresAuth: true });
  return normalizarRespuestaPaginada<Reserva>(data, params?.limite);
}

export async function crearReserva(datos: CrearReservaDTO): Promise<{ mensaje: string; reserva: Reserva }> {
  return apiMutacion(() =>
    apiRequest<{ mensaje: string; reserva: Reserva }>('/reservas', {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify(datos),
    }),
  );
}

export async function obtenerReservaPorId(id: number): Promise<Reserva> {
  return apiRequest<Reserva>(`/reservas/${id}`, { requiresAuth: true });
}

export async function actualizarReserva(id: number, datos: ActualizarReservaDTO): Promise<{ mensaje: string }> {
  return apiMutacion(() =>
    apiRequest<{ mensaje: string }>(`/reservas/${id}`, {
      method: 'PUT',
      requiresAuth: true,
      body: JSON.stringify(datos),
    }),
  );
}

export async function eliminarReserva(id: number): Promise<{ mensaje: string }> {
  return apiMutacion(() =>
    apiRequest<{ mensaje: string }>(`/reservas/${id}`, {
      method: 'DELETE',
      requiresAuth: true,
    }),
  );
}

// --- Pasajeros (ReservaCliente) ---

export async function obtenerPasajerosDeReserva(reservaId: number): Promise<ReservaCliente[]> {
  return apiRequest<ReservaCliente[]>(`/reservas/${reservaId}/pasajeros`, { requiresAuth: true });
}

export async function agregarPasajero(reservaId: number, datos: CrearPasajeroDTO): Promise<{ mensaje: string; pasajero_id: number }> {
  return apiMutacion(() =>
    apiRequest<{ mensaje: string; pasajero_id: number }>(`/reservas/${reservaId}/pasajeros`, {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify(datos),
    })
  );
}

export async function actualizarPasajero(reservaId: number, pasajeroId: number, datos: ActualizarPasajeroDTO): Promise<{ mensaje: string }> {
  return apiRequest<{ mensaje: string }>(`/reservas/${reservaId}/pasajeros/${pasajeroId}`, {
    method: 'PUT',
    requiresAuth: true,
    body: JSON.stringify(datos),
  });
}

export async function eliminarPasajero(reservaId: number, pasajeroId: number): Promise<{ mensaje: string }> {
  return apiRequest<{ mensaje: string }>(`/reservas/${reservaId}/pasajeros/${pasajeroId}`, {
    method: 'DELETE',
    requiresAuth: true,
  });
}

// --- Asientos Reservados ---

export async function obtenerAsientosDePasajero(reservaId: number, pasajeroId: number): Promise<AsientoReservado[]> {
  return apiRequest<AsientoReservado[]>(`/reservas/${reservaId}/pasajeros/${pasajeroId}/asientos`, { requiresAuth: true });
}

export async function asignarAsiento(reservaId: number, pasajeroId: number, datos: AsignarAsientoDTO): Promise<{ mensaje: string; asiento_reservado_id: number }> {
  return apiRequest<{ mensaje: string; asiento_reservado_id: number }>(
    `/reservas/${reservaId}/pasajeros/${pasajeroId}/asientos`,
    {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify(datos),
    }
  );
}

export async function liberarAsiento(reservaId: number, pasajeroId: number, asientoReservadoId: number): Promise<{ mensaje: string }> {
  return apiRequest<{ mensaje: string }>(
    `/reservas/${reservaId}/pasajeros/${pasajeroId}/asientos/${asientoReservadoId}`,
    {
      method: 'DELETE',
      requiresAuth: true,
    }
  );
}

