import type { Banco, EstadoPago, MetodoPago, PagoReserva, TasaCambio } from './pagos';

export const METODOS_PAGO_PORTAL = ['pago_movil', 'transferencia'] as const;
export type MetodoPagoPortalCodigo = (typeof METODOS_PAGO_PORTAL)[number];

export const ETIQUETA_ESTADO_PAGO_PORTAL: Record<EstadoPago, string> = {
  en_validacion: 'Pendiente de validación',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
};

export const DEPOSITO_MINIMO_EUR = 5;

export interface ResumenPagoPortalReserva {
  total_reserva_eur: number;
  saldo_pendiente_eur: number;
  pagado_completo: boolean;
  total_pagado_aprobado_eur?: number;
  total_pendiente_validacion_eur?: number;
  deposito_minimo_eur?: number;
  deposito_minimo_cumplido?: boolean;
  monto_sugerido_eur?: number;
}

export interface CotizacionPortal {
  metodo_pago_id?: number;
  moneda_codigo?: string;
  moneda?: string;
  monto: number;
  monto_eur?: number;
}

export interface TasaEurPortal {
  tasa: TasaCambio;
  valor: number;
  es_del_dia: boolean;
}

export interface CuentaReceptoraPortal {
  banco_destino_id: number;
}

export interface ResumenPagoPortal {
  resumen: ResumenPagoPortalReserva;
  tasa_eur: TasaEurPortal | null;
  cotizacion_saldo_pendiente: CotizacionPortal[];
  bancos: Banco[];
  metodos_pago: MetodoPago[];
  cuenta_receptora?: CuentaReceptoraPortal | null;
  banco_destino_id?: number | null;
  deposito_minimo_eur?: number;
}

export interface CotizarPagoPortalParams {
  monto_eur: number;
  metodo_pago_id: number;
  tasa_id: number;
}

export interface CotizarPagoPortalRespuesta {
  monto: number;
  monto_eur?: number;
  tasa?: TasaCambio;
}

export interface ReportarPagoPortalDTO {
  metodo_pago_id: number;
  tasa_id: number;
  monto: number;
  tipo: 'cuota' | 'total';
  fecha_pago: string;
  referencia?: string | null;
  banco_origen_id?: number | null;
  banco_destino_id?: number | null;
  telefono_origen?: string | null;
  comprobante_url?: string | null;
  notas?: string | null;
}

export interface ReportarPagoPortalRespuesta {
  mensaje: string;
  pago: PagoReserva;
}

/** Reserva del cliente (GET /reservas/portal/mis-reservas). */
export interface ReservaPortalMis {
  id: number;
  viaje_id?: number;
  destino_nombre?: string | null;
  destino_imagen?: string | null;
  ubicacion?: string | null;
  fecha_salida?: string | null;
  hora_salida?: string | null;
  asientos?: string[];
  estado?: string | null;
  resumen_pagos?: ResumenPagoPortalReserva | null;
}

/** Pago listado del portal (GET /pagos/portal/mis-pagos). */
export interface PagoPortalMis {
  id: number;
  reserva_id: number;
  reserva?: { id: number };
  estado: EstadoPago;
  estado_etiqueta: string;
  monto: number;
  monto_eur: number;
  metodo_pago: MetodoPago;
  referencia?: string | null;
  fecha_pago?: string | null;
}

/** Detalle de pago portal (GET /reservas/{id}/pagos/portal/{pago_id}). */
export interface PagoPortalDetalle extends PagoPortalMis {
  banco_origen?: Banco | null;
  banco_destino?: Banco | null;
  telefono_origen?: string | null;
  comprobante_url?: string | null;
  tiene_comprobante?: boolean;
  validado_en?: string | null;
}
