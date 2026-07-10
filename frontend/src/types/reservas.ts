import type { Cliente } from './cliente';
import type { PuntoRecogidaInline } from './puntoRecogida';
import type { Viaje } from './viaje';

export interface Reserva {
  id: number;
  cliente_id: number;
  viaje_id: number;
  fecha_reserva: string;
  estado: "pendiente" | "confirmada" | "abonada" | "cancelada";
  creado_en: string;
  actualizado_en: string;
}

export type ReservaEnriquecida = Reserva & {
  clienteObj?: Cliente;
  viajeObj?: Viaje;
};

/** Pasajero de una reserva tal como lo devuelve GET /reservas/:id/pasajeros */
export interface ReservaCliente {
  id: number;
  reserva_id: number;
  cliente_id: number;
  es_titular: boolean;
  // Datos personales provenientes de JOIN con clientes
  nombre: string;
  apellido: string;
  tipo_documento: string;
  numero_documento: string;
  // Datos propios de la reserva
  es_menor: boolean;
  ocupa_asiento: boolean;
  precio_pasajero_eur: number;
  recargo_eur: number;
  notas_tarifa: string | null;
  punto_recogida_id?: number | null;
  punto_recogida_nombre?: string | null;
}

export interface AsientoReservado {
  id: number;
  asiento_id: number;
  viaje_id: number;
}

export interface CrearReservaDTO {
  cliente_id: number;
  viaje_id: number;
  estado?: string;
}

export interface ActualizarReservaDTO {
  estado?: string;
}

/** Para agregar un pasajero ya registrado como cliente a una reserva */
export interface CrearPasajeroDTO {
  cliente_id: number;
  es_menor?: boolean;
  ocupa_asiento?: boolean;
  precio_pasajero_eur?: number;
  recargo_eur?: number;
  notas_tarifa?: string | null;
  punto_recogida_id?: number | null;
  puntos_recogida?: PuntoRecogidaInline[];
}

/** Para editar solo los campos de reserva de un pasajero (no datos personales) */
export interface ActualizarPasajeroDTO {
  es_menor?: boolean;
  ocupa_asiento?: boolean;
  precio_pasajero_eur?: number;
  recargo_eur?: number;
  notas_tarifa?: string | null;
  punto_recogida_id?: number | null;
}

export interface AsignarAsientoDTO {
  asiento_id: number;
}

/**
 * Draft usado en el formulario admin al crear una reserva.
 * Contiene el cliente ya seleccionado + campos de reserva.
 */
export interface PasajeroDraft {
  id_temporal: number;
  // Cliente seleccionado del catálogo
  cliente_id: number;
  nombre: string;       // solo para mostrar en UI, viene del cliente
  apellido: string;
  numero_documento: string;
  tipo_documento: string;
  // Campos propios de la reserva
  es_menor: boolean;
  ocupa_asiento: boolean;
  precio_pasajero_eur: number;
  recargo_eur: number;
  notas_tarifa: string;
  punto_recogida_id?: number;
  /** Domicilio inline cuando el acompañante no tiene uno registrado. */
  puntos_recogida?: PuntoRecogidaInline;
}

/** Disponibilidad de un viaje para reservar (GET /reservas/viajes-disponibles). */
export interface DisponibilidadViajeReserva {
  tiene_unidad: boolean;
  unidad_id: number | null;
  unidad_placa: string | null;
  total_asientos: number;
  asientos_ocupados: number;
  asientos_disponibles: number;
  asientos_completos: boolean;
  disponible_para_reserva: boolean;
  motivo_no_disponible: string | null;
}

/** Viaje listado para el select al crear reserva. */
export interface ViajeDisponibleReserva {
  id: number;
  destino_id: number;
  destino_nombre: string;
  precio_base_eur: number;
  fecha_salida: string;
  fecha_regreso: string;
  estado: string;
  unidad_id: number | null;
  disponibilidad: DisponibilidadViajeReserva;
}
