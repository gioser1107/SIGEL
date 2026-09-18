import type { Cliente, DatosClienteNuevo } from './cliente';
import type { PuntoRecogidaInline } from './puntoRecogida';
import type { FormularioCliente } from '../utils/validacionesCliente';
import type { Viaje } from './viaje';

export interface Reserva {
  id: number;
  cliente_id: number;
  viaje_id: number;
  fecha_reserva: string;
  estado: "pendiente" | "confirmada" | "abonada" | "cancelada";
  modalidad?: "individual" | "grupo" | "propio";
  tipo_hospedaje?: "compartido" | "particular";
  creado_en: string;
  actualizado_en: string;
  destino_nombre?: string | null;
  fecha_salida?: string | null;
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
  fecha_nacimiento?: string | null;
  partida_nacimiento_url?: string | null;
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
  modalidad?: string;
  tipo_hospedaje?: string;
}

export interface ActualizarReservaDTO {
  estado?: string;
  modalidad?: string;
  tipo_hospedaje?: string;
}

/** Para agregar un pasajero: cliente ya registrado o ficha nueva en la misma reserva. */
export interface CrearPasajeroDTO {
  cliente_id?: number;
  cliente?: DatosClienteNuevo;
  es_menor?: boolean;
  fecha_nacimiento?: string | null;
  partida_nacimiento_url?: string | null;
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
  fecha_nacimiento?: string | null;
  partida_nacimiento_url?: string | null;
  ocupa_asiento?: boolean;
  precio_pasajero_eur?: number;
  recargo_eur?: number;
  notas_tarifa?: string | null;
  punto_recogida_id?: number | null;
}

export interface AsignarAsientoDTO {
  asiento_id: number;
}

export type ModoPasajeroDraft = 'existente' | 'nuevo';

/**
 * Draft usado en el formulario admin al crear una reserva.
 * Puede ser un cliente del catálogo o una persona nueva (viaje grupal).
 */
export interface PasajeroDraft {
  id_temporal: number;
  modo: ModoPasajeroDraft;
  // Cliente seleccionado del catálogo (modo existente)
  cliente_id: number;
  nombre: string;
  apellido: string;
  numero_documento: string;
  tipo_documento: string;
  ficha?: FormularioCliente;
  // Campos propios de la reserva
  es_menor: boolean;
  fecha_nacimiento?: string;
  partida_nacimiento_url?: string | null;
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
  recargo_menor_eur?: number;
  extra_hospedaje_particular_eur?: number;
  fecha_salida: string;
  fecha_regreso: string;
  estado: string;
  unidad_id: number | null;
  disponibilidad: DisponibilidadViajeReserva;
}
