export interface Asiento {
  id: number;
  unidad_id: number;
  numero: string;
  posicion: "ventana" | "pasillo" | "medio" | "otro";
  fila: number | null;
  columna: number | null;
}

export interface CrearAsientoDTO {
  unidad_id: number;
  numero: string;
  posicion?: "ventana" | "pasillo" | "medio" | "otro";
  fila?: number | null;
  columna?: number | null;
}

export interface ActualizarAsientoDTO {
  numero?: string;
  posicion?: "ventana" | "pasillo" | "medio" | "otro";
  fila?: number | null;
  columna?: number | null;
}

export interface RespuestaPlantillaCroquis {
  mensaje: string;
  total_asientos: number;
  croquis: import('./unidad').CroquisUnidadDatos;
  asientos: Asiento[];
}
