export interface Resena {
  id: number;
  reserva_id: number;
  calificacion: number;
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
  resena: Resena | null;
}

export interface DatosCrearResena {
  reserva_id: number;
  calificacion: number;
  comentario?: string;
}
