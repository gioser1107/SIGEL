export interface RangoDisponible {
  desde: string | null;
  hasta: string | null;
}

export interface DestinoReservadoReporte {
  id: number;
  nombre: string;
  reservas: number;
  pasajeros: number;
}

export interface DestinoCotizadoReporte {
  id: number;
  nombre: string;
  cotizaciones: number;
}

export interface MovimientoMensualReporte {
  mes: string;
  etiqueta: string;
  reservas: number;
  pasajeros: number;
  ingresos_eur: number;
}

export interface ReservasDiaReporte {
  fecha: string;
  reservas: number;
  pasajeros: number;
}

export interface ReservaPeriodoReporte {
  id: number;
  fecha: string;
  destino: string;
  pasajeros: number;
  estado: string;
}

export interface ConteoEtiquetado {
  tipo?: string;
  estado?: string;
  total: number;
}

export interface PagoMetodoReporte {
  metodo: string;
  pagos: number;
  ingresos_eur: number;
}

export interface OcupacionViajeReporte {
  id: number;
  destino: string;
  fecha_salida: string | null;
  estado: string;
  asientos_ocupados: number;
  asientos_total: number;
  porcentaje: number;
}

export interface ReporteEstadistico {
  desde: string;
  hasta: string;
  rango_disponible: RangoDisponible;
  resumen: {
    clientes_nuevos: number;
    reservas: number;
    reservas_activas: number;
    reservas_canceladas: number;
    pasajeros: number;
    pasajeros_adultos: number;
    pasajeros_menores: number;
    cotizaciones: number;
    cotizaciones_aceptadas: number;
    conversion_cotizaciones_pct: number;
    ingresos_aprobados_eur: number;
    pagos_aprobados: number;
    pagos_periodo: number;
  };
  clientes_por_tipo: ConteoEtiquetado[];
  reservas_por_estado: ConteoEtiquetado[];
  destinos_mas_reservados: DestinoReservadoReporte[];
  destinos_mas_cotizados: DestinoCotizadoReporte[];
  movimiento_mensual: MovimientoMensualReporte[];
  mes_mayor_movimiento: MovimientoMensualReporte | null;
  reservas_por_dia: ReservasDiaReporte[];
  reservas_del_periodo: ReservaPeriodoReporte[];
  cotizaciones_por_estado: ConteoEtiquetado[];
  pagos_por_estado: ConteoEtiquetado[];
  pagos_por_metodo: PagoMetodoReporte[];
  ocupacion_viajes: OcupacionViajeReporte[];
}
