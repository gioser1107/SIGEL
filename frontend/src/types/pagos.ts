export interface Moneda {
  id: number;
  codigo: string;
  nombre: string;
  simbolo: string;
}

export interface MetodoPago {
  id: number;
  codigo: string;
  nombre: string;
  moneda: Moneda;
}

export interface Banco {
  id: number;
  codigo: string;
  nombre: string;
  activo?: boolean;
}

export interface PuntoVenta {
  id: number;
  banco_id: number;
  codigo: string;
  nombre: string;
  numero_terminal: string;
  activo?: boolean;
  banco?: Banco;
}

export interface TasaCambio {
  id: number;
  fecha: string;
  valor: number;
  origen?: 'manual' | 'bcv';
  moneda: Moneda;
}

export interface SincronizarTasaBcvRespuesta {
  omitido: boolean;
  mensaje: string;
  tasas: TasaCambio[];
}

export interface TasaDelDiaRespuesta {
  tasa: TasaCambio;
  fecha: string;
  valor: number;
  es_del_dia: boolean;
}

export interface CatalogoPagos {
  metodos_pago: MetodoPago[];
  bancos: Banco[];
  puntos_venta: PuntoVenta[];
  tasa_eur_reciente: TasaCambio | null;
  tasas: TasaCambio[];
}

export interface ResumenPagosReserva {
  reserva_id: number;
  estado_reserva: string;
  destino: {
    id: number;
    nombre: string;
    precio_unitario_eur: number;
  };
  cantidad_pasajeros: number;
  recargos_eur: number;
  total_reserva_eur: number;
  origen_total: 'destino' | 'pasajeros' | 'mixto';
  total_pagado_aprobado_eur: number;
  total_pendiente_validacion_eur: number;
  total_rechazado_eur: number;
  saldo_pendiente_eur: number;
  pagado_completo: boolean;
  deposito_minimo_eur?: number;
  deposito_minimo_cumplido?: boolean;
  monto_sugerido_eur?: number;
  cantidad_pagos: number;
  cantidad_aprobados: number;
  cantidad_en_validacion: number;
  cantidad_rechazados: number;
}

export type EstadoPago = 'en_validacion' | 'aprobado' | 'rechazado';
export type TipoPago = 'cuota' | 'total';

export interface PagoReserva {
  id: number;
  reserva_id: number;
  metodo_pago: MetodoPago;
  tasa: TasaCambio;
  monto: number;
  tipo: TipoPago;
  estado: EstadoPago;
  fecha_pago: string;
  referencia: string | null;
  banco_origen: Banco | null;
  banco_destino: Banco | null;
  punto_venta: PuntoVenta | null;
  telefono_origen: string | null;
  correo_origen: string | null;
  comprobante_url: string | null;
  validado_por: number | null;
  validado_en: string | null;
  notas: string | null;
  creado_por: number;
  creado_en: string;
  actualizado_en: string;
  /** Equivalente en EUR (portal / bandeja). */
  monto_eur?: number;
  /** Etiqueta legible del estado. */
  estado_etiqueta?: string;
  tiene_comprobante?: boolean;
}

export interface ActualizarPagoDTO {
  metodo_pago_id?: number;
  tasa_id?: number;
  monto?: number;
  tipo?: TipoPago;
  fecha_pago?: string;
  referencia?: string | null;
  banco_origen_id?: number | null;
  banco_destino_id?: number | null;
  punto_venta_id?: number | null;
  telefono_origen?: string | null;
  correo_origen?: string | null;
  comprobante_url?: string | null;
  notas?: string | null;
  estado?: EstadoPago;
}

export interface CrearPagoDTO {
  metodo_pago_id: number;
  tasa_id: number;
  monto: number;
  tipo?: TipoPago;
  fecha_pago?: string;
  referencia?: string | null;
  banco_origen_id?: number | null;
  banco_destino_id?: number | null;
  punto_venta_id?: number | null;
  telefono_origen?: string | null;
  correo_origen?: string | null;
  comprobante_url?: string | null;
  notas?: string | null;
  /** Desde admin: aprobado al registrar salvo pago móvil / Zelle. */
  estado?: EstadoPago;
}

export interface FormularioPagoDraft {
  metodo_pago_id: string;
  tasa_id: string;
  monto: string;
  tipo: TipoPago;
  fecha_pago: string;
  referencia: string;
  banco_origen_id: string;
  banco_destino_id: string;
  punto_venta_id: string;
  telefono_origen: string;
  correo_origen: string;
  comprobante_url: string;
  notas: string;
}

export interface CrearMonedaDTO {
  codigo: string;
  nombre: string;
  simbolo: string;
}

export interface EditarMonedaDTO {
  codigo?: string;
  nombre?: string;
  simbolo?: string;
}

export interface CrearMetodoPagoDTO {
  codigo: string;
  nombre: string;
  moneda_id: number;
}

export interface EditarMetodoPagoDTO {
  codigo?: string;
  nombre?: string;
  moneda_id?: number;
}

export interface CrearTasaDTO {
  fecha: string;
  valor: number;
  moneda_id: number;
}

export interface EditarTasaDTO {
  fecha?: string;
  valor?: number;
  moneda_id?: number;
}

export interface CrearBancoDTO {
  codigo: string;
  nombre: string;
  activo?: boolean;
}

export interface EditarBancoDTO {
  codigo?: string;
  nombre?: string;
  activo?: boolean;
}

export interface CrearPuntoVentaDTO {
  banco_id: number;
  codigo: string;
  nombre: string;
  numero_terminal: string;
  activo?: boolean;
}

export interface EditarPuntoVentaDTO {
  banco_id?: number;
  codigo?: string;
  nombre?: string;
  numero_terminal?: string;
  activo?: boolean;
}

export interface PagoGlobal extends PagoReserva {
  monto_eur: number;
  conversion_aproximada: boolean;
}

export interface FiltrosPagosGlobal {
  reserva_id?: number;
  estado?: EstadoPago;
  metodo_pago_id?: number;
  fecha_desde?: string;
  fecha_hasta?: string;
  pagina?: number;
  limite?: number;
}
