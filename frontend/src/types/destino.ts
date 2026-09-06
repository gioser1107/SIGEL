/**
 * Tipos del módulo admin de destinos turísticos.
 */

export type DificultadDestino = 'Fácil' | 'Moderado' | 'Difícil';

export interface DestinoImagen {
  id: number;
  url: string;
  orden: number;
  es_portada: boolean;
}

export interface Destino {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio_base_eur: number;
  dificultad: DificultadDestino;
  activo: boolean;
  imagen?: string;
  imagenes?: DestinoImagen[];
  creado_en: string;
  actualizado_en: string;
  eliminado_en?: string | null;
}

export interface DatosDestinoNuevo {
  nombre: string;
  descripcion?: string | null;
  precio_base_eur: number;
  dificultad: DificultadDestino;
  activo?: boolean;
}

export interface DatosImagenDestinoActualizar {
  es_portada?: boolean;
}

export type DatosDestinoActualizar = Partial<DatosDestinoNuevo>;
