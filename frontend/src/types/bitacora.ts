export interface EntradaBitacora {
  id: number;
  creado_en: string;
  modulo: string;
  accion: string;
  tabla_afectada: string | null;
  registro_id: string | null;
  resumen: string;
  ip_origen: string | null;
  usuario_id: number | null;
  usuario_nombre: string | null;
  usuario_correo: string | null;
}

export interface DetalleBitacora extends EntradaBitacora {
  detalle: Record<string, unknown> | null;
}

export interface RespuestaBitacora {
  items: EntradaBitacora[];
  total: number;
  pagina: number;
  limite: number;
}

export interface FiltrosBitacora {
  modulo?: string;
  accion?: string;
  usuario_id?: number;
  fecha_desde?: string;
  fecha_hasta?: string;
  q?: string;
  limite?: number;
  pagina?: number;
}
