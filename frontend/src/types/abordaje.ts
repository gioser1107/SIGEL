export type EstadoAbordaje = 'pendiente' | 'abordado' | 'no_presentado';

export interface ClienteManifiesto {
  nombre: string;
  apellido: string;
  tipo_documento: string;
  numero_documento: string;
  telefono?: string | null;
}

export interface DomicilioManifiesto {
  nombre?: string | null;
  direccion?: string | null;
  ciudad?: string | null;
  referencia?: string | null;
}

export interface AsientoManifiesto {
  numero: string;
  posicion?: string | null;
}

export interface AbordajeRegistro {
  id: number;
  estado: EstadoAbordaje;
  notas?: string | null;
  registrado_en?: string | null;
}

export interface PasajeroManifiesto {
  reserva_cliente_id: number;
  reserva_id: number;
  reserva_estado: string;
  es_titular: boolean;
  es_menor: boolean;
  cliente: ClienteManifiesto;
  domicilio?: DomicilioManifiesto | null;
  asiento?: AsientoManifiesto | null;
  orden_ruta?: number | null;
  hora_recogida_programada?: string | null;
  estado_abordaje: EstadoAbordaje;
  abordaje: AbordajeRegistro | null;
}

export interface ResumenAbordaje {
  total_pasajeros: number;
  abordados: number;
  no_presentados: number;
  pendientes: number;
}

export interface ViajeManifiesto {
  id: number;
  destino_nombre?: string | null;
  fecha_salida?: string | null;
  guia_nombre?: string | null;
  estado?: string | null;
}

export interface ManifiestoAbordaje {
  viaje: ViajeManifiesto;
  resumen: ResumenAbordaje;
  pasajeros: PasajeroManifiesto[];
}

export interface ViajeSelectorAbordaje {
  id: number;
  destino_nombre?: string | null;
  fecha_salida?: string | null;
  guia_nombre?: string | null;
  estado?: string | null;
  resumen?: ResumenAbordaje;
}

export interface MarcarAbordajeDTO {
  estado: 'abordado' | 'no_presentado';
  notas?: string | null;
}

export interface RegistroLoteItem {
  reserva_cliente_id: number;
  estado: 'abordado' | 'no_presentado';
  notas?: string | null;
}

export interface RegistrarLoteDTO {
  pasajeros: RegistroLoteItem[];
}

export interface EditarAbordajeDTO {
  estado?: EstadoAbordaje;
  notas?: string | null;
}
