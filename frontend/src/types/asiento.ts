export interface Asiento {
  id: number;
  unidad_id: number;
  numero: string;
  posicion: "ventana" | "pasillo" | "medio" | "otro";
}

export interface CrearAsientoDTO {
  unidad_id: number;
  numero: string;
  posicion?: "ventana" | "pasillo" | "medio" | "otro";
}

export interface ActualizarAsientoDTO {
  numero?: string;
  posicion?: "ventana" | "pasillo" | "medio" | "otro";
}
