/** Domicilio de recogida del cliente (la agencia pasa a buscarlo). */
export interface PuntoRecogida {
  id: number;
  nombre: string;
  direccion?: string | null;
  ciudad?: string | null;
  estado?: string | null;
  notas_referencia?: string | null;
  /** Alias de notas_referencia en respuestas API. */
  referencia?: string | null;
  tipo?: string;
  activo?: boolean;
  es_predeterminado?: boolean;
}

/** Domicilio nuevo inline (registro / admin crear cliente). */
export interface PuntoRecogidaInline {
  nombre: string;
  direccion: string;
  ciudad: string;
  estado: string;
  notas_referencia: string;
  es_predeterminado?: boolean;
}

export interface DomicilioRecogidaDTO {
  nombre: string;
  direccion: string;
  ciudad: string;
  estado: string;
  notas_referencia: string;
  es_predeterminado?: boolean;
}

export type EditarDomicilioRecogidaDTO = Partial<DomicilioRecogidaDTO>;

/** @deprecated Usar DomicilioRecogidaDTO sin punto_recogida_id. */
export interface AgregarPuntoClienteDTO extends Partial<DomicilioRecogidaDTO> {
  punto_recogida_id?: number;
}

export interface DatosPuntoRecogidaCatalogo {
  nombre: string;
  direccion?: string | null;
  ciudad?: string | null;
  estado?: string | null;
  notas_referencia?: string | null;
  activo?: boolean;
}

/** Cliente vinculado a un domicilio (detalle GET /puntos-recogida/{id}). */
export interface ClienteVinculadoPuntoRecogida {
  cliente_id: number;
  nombre: string;
  apellido: string;
  tipo_documento?: string;
  numero_documento?: string;
  es_predeterminado?: boolean;
}

/** Fila del listado admin GET /puntos-recogida. */
export interface PuntoRecogidaListado extends PuntoRecogida {
  cliente_id?: number | null;
  cliente_nombre?: string | null;
  cliente_apellido?: string | null;
  cliente_tipo_documento?: string | null;
  cliente_numero_documento?: string | null;
}

export interface PuntoRecogidaDetalle extends PuntoRecogida {
  clientes?: ClienteVinculadoPuntoRecogida[];
  clientes_vinculados?: ClienteVinculadoPuntoRecogida[];
}

export interface FiltrosPuntosRecogidaAdmin {
  cliente_id?: number;
  buscar?: string;
  solo_activos?: boolean;
}

export type ModoPuntosRecogidaEditor = 'register' | 'admin-create' | 'admin-edit' | 'profile';

/** Estado en memoria antes de enviar registro o crear cliente admin. */
export interface PuntosRecogidaDraft {
  nuevos: PuntoRecogidaInline[];
  predeterminadoNuevoIndex?: number;
}

export const PUNTOS_RECOGIDA_DRAFT_VACIO: PuntosRecogidaDraft = {
  nuevos: [],
};
