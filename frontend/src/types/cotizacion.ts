export type EstadoCotizacion = 'solicitada' | 'pendiente' | 'aceptada' | 'vencida' | 'cancelada';

export interface LogisticaViaje {
  fechaDesde: string;
  fechaHasta: string;
  horaSalida: string;
}

export interface PerfilViajero {
  cantidadPersonas: number;
  cantidadNinos: number;
  rangoEdades: string;
  llevaMascotas: boolean;
  descripcionMascotas: string;
  condicionesMedicas: string;
  preferenciasAlimentarias: string;
}

export interface ServicioCotizacion {
  id: string;
  nombre: string;
  icono: string;
  seleccionado: boolean;
}

export interface Cotizacion {
  id: number;
  cliente_id: number;
  cliente_nombre: string | null;
  cliente_razon_social: string | null;
  destino_id: number;
  destino_nombre: string | null;
  requisitos: string | null;
  precio_cotizado_eur: number | null;
  valida_hasta: string | null;
  estado: EstadoCotizacion;
  creado_en: string;
  actualizado_en: string;
  lineas?: CotizacionLinea[];
  logistica?: LogisticaViaje;
  perfilViajero?: PerfilViajero;
  servicios?: ServicioCotizacion[];
}

export interface CotizacionLinea {
  id: number;
  cotizacion_id: number;
  categoria: string;
  monto_eur: number;
  descripcion: string | null;
}

export interface ResumenLineasCotizacion {
  cotizacion_id: number;
  total_eur: number;
  por_categoria: { categoria: string; monto_eur: number }[];
}

export interface DatosCotizacionNueva {
  cliente_id?: number;
  destino_id: number;
  requisitos?: string | null;
  precio_cotizado_eur?: number | null;
  valida_hasta?: string | null;
  estado?: EstadoCotizacion;
}

export interface DatosLineaCotizacionNueva {
  categoria: string;
  monto_eur: number;
  descripcion?: string | null;
}

export interface NuevaCotizacion {
  destinoId: number;
  destinoNombre: string;
  requisitos: string;
  // Opcionales para el esqueleto en el formulario
  logistica?: LogisticaViaje;
  perfilViajero?: PerfilViajero;
  servicios?: ServicioCotizacion[];
}
