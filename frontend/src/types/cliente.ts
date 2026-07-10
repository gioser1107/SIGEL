/**
 * Tipos del módulo de clientes (panel administrativo).
 */

import type { PuntoRecogida, PuntoRecogidaInline } from './puntoRecogida';

export type TipoCliente = 'natural' | 'juridico';
export type TipoDocumento = 'V' | 'E' | 'J' | 'G' | 'P' | 'otro';

export interface Cliente {
  id: number;
  cliente_id: number;
  usuario_id: number | null;
  correo: string | null;
  tipo_cliente: TipoCliente;
  tipo_documento: TipoDocumento;
  numero_documento: string;
  nombre: string;
  apellido: string;
  razon_social: string | null;
  telefono: string | null;
  telefono_secundario: string | null;
  direccion: string | null;
  estado_id: number | null;
  estado: string | null;
  ciudad_id: number | null;
  ciudad: string | null;
  notas: string | null;
  creado_por: number | null;
  actualizado_por: number | null;
  puntos_recogida?: PuntoRecogida[];
}

export interface EstadoUbicacion {
  id: number;
  nombre: string;
}

export interface CiudadUbicacion {
  id: number;
  estado_id: number;
  nombre: string;
}

export interface DatosClienteNuevo {
  nombre: string;
  apellido: string;
  tipo_cliente: TipoCliente;
  tipo_documento: TipoDocumento;
  numero_documento: string;
  razon_social?: string | null;
  telefono?: string;
  telefono_secundario?: string;
  direccion?: string;
  estado_id: number;
  ciudad_id: number;
  notas?: string;
  punto_recogida_ids?: number[];
  puntos_recogida?: PuntoRecogidaInline[];
}

export type DatosClienteEdicion = Partial<DatosClienteNuevo>;
