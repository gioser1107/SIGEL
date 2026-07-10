/**
 * viaje.ts — Tipos compartidos para el flujo de viajes del cliente y planificación logística.
 */

export interface GuiaDisponible {
  id: number;
  nombre: string;
  correo: string;
  telefono: string | null;
}

/** Guía asignado a un viaje (pivote viajes_guias). */
export interface GuiaViaje {
  id: number;
  nombre: string;
  correo?: string;
  es_principal: boolean;
}

export interface Viaje {
  precio_base: number;
  id: number;
  destino_id: number;
  destino_nombre: string | null;
  unidad_id: number;
  unidad_placa: string | null;
  guias?: GuiaViaje[];
  guia_principal_id?: number | null;
  guia_principal_nombre?: string | null;
  /** Alias del guía principal (compatibilidad). */
  guia_id: number | null;
  guia_nombre: string | null;
  fecha_salida: string;
  fecha_regreso: string | null;
  estado: string;
  creado_en: string;
  actualizado_en: string;
  eliminado_en?: string | null;
}

export interface DatosViajeNuevo {
  destino_id: number;
  unidad_id: number;
  guias_ids?: number[];
  guia_principal_id?: number | null;
  /** Legacy: un solo guía (preferir guias_ids). */
  guia_id?: number | null;
  fecha_salida: string;
  fecha_regreso?: string | null;
  estado?: string;
}

export interface Parada {
  viaje_id: number;
  orden: number;
  punto_recogida_id: number;
  punto_nombre: string | null;
  hora_programada: string | null;
  notas: string | null;
}

export interface DatosParadaNueva {
  punto_recogida_id: number;
  orden: number;
  hora_programada?: string | null;
  notas?: string | null;
}

export interface DatosParadaActualizar {
  punto_recogida_id?: number;
  hora_programada?: string | null;
  notas?: string | null;
}

/* ─── Ruta de recogida (viajeros con domicilio) ─── */

export interface ClienteRutaRecogida {
  nombre: string;
  apellido: string;
  telefono: string;
  numero_documento: string;
}

export interface DomicilioRutaRecogida {
  direccion: string;
  referencia: string | null;
  ciudad: string;
  estado: string;
}

export interface CandidatoRutaRecogida {
  reserva_cliente_id: number;
  reserva_id: number;
  es_titular: boolean;
  cliente: ClienteRutaRecogida;
  domicilio: DomicilioRutaRecogida | null;
  en_ruta: boolean;
  orden_ruta: number | null;
}

export interface RespuestaCandidatosRutaRecogida {
  viaje_id: number;
  reservas_activas: number;
  viajeros_total: number;
  viajeros_sin_domicilio: number;
  viajeros_en_ruta: number;
  candidatos: CandidatoRutaRecogida[];
}

export interface ParadaRutaRecogida {
  reserva_cliente_id: number;
  reserva_id: number;
  orden: number;
  hora_programada: string | null;
  notas: string | null;
  es_titular?: boolean;
  cliente: ClienteRutaRecogida;
  domicilio: DomicilioRutaRecogida;
}

export interface ParadaRutaRecogidaDTO {
  reserva_cliente_id: number;
  orden: number;
  hora_programada: string | null;
  notas: string | null;
}

export interface GuardarRutaRecogidaDTO {
  paradas: ParadaRutaRecogidaDTO[];
}

export interface Costo {
  id: number;
  viaje_id: number;
  categoria: string;
  monto_eur: number;
  descripcion: string | null;
}

export interface DatosCostoNuevo {
  categoria: string;
  monto_eur: number;
  descripcion?: string | null;
}

export interface DatosCostoActualizar {
  categoria?: string;
  monto_eur?: number;
  descripcion?: string | null;
}

export interface ResumenCostos {
  viaje_id: number;
  total_eur: number;
  por_categoria: { categoria: string; monto_eur: number }[];
}

/** Datos de un viaje disponible en la agenda */
export interface ViajeAgenda {
  id: number;
  titulo: string;
  ubicacion: string;
  precio: number;
  recargo_menor_eur: number;
  imagen: string;
  hora: string;
  cupos: number;
  duracion: string;
  dificultad: 'Fácil' | 'Moderado' | 'Difícil';
  descripcion: string;
}

/** Viaje seleccionado para reservar (incluye la fecha del calendario) */
export interface ViajePendiente {
  viaje: ViajeAgenda;
  fecha: string; // "YYYY-MM-DD"
}

/** Estado de una reserva del cliente */
export type EstadoReserva = 'pendiente' | 'aprobado' | 'rechazado';

/** Reserva completa registrada por el cliente */
export interface ReservaCliente {
  id: string;
  viaje: ViajeAgenda;
  fecha: string;
  asientos: number[];
  pago: {
    metodo: string;
    banco: string;
    referencia: string;
    monto: string;
    fecha: string;
    cantidadPuestos: number;
  };
  titularPuntoRecogidaId?: number;
  pasajeros?: any[];
  estado: EstadoReserva;
  creadoEn: string;
}

/** Asiento individual con estado de disponibilidad para un viaje */
export interface AsientoViaje {
  id: number;
  numero: string;
  posicion: 'ventana' | 'pasillo' | 'medio' | 'otro';
  ocupado: boolean;
}

/** Respuesta del endpoint GET /viajes/{id}/asientos-disponibles */
export interface RespuestaAsientosViaje {
  viaje_id: number;
  unidad_id: number;
  total_asientos: number;
  total_ocupados: number;
  total_disponibles: number;
  asientos: AsientoViaje[];
}
