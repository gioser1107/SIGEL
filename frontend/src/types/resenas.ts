export interface Resena {
  id: number;
  reserva_id: number;
  calificacion: number;
  calificacion_guia?: number | null;
  comentario: string | null;
  publico: boolean;
  nombre_cliente: string;
  destino_titulo: string;
  creado_en: string | null;
  actualizado_en: string | null;
}

export interface ReservaElegibleResena {
  reserva_id: number;
  destino_titulo: string;
  fecha_viaje: string;
  estado_reserva: string;
  guia_nombre?: string | null;
  resena: Resena | null;
}

export interface DatosCrearResena {
  reserva_id: number;
  calificacion: number;
  calificacion_guia?: number;
  comentario?: string;
}
