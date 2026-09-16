export interface UnidadTransporte {
  id: number;
  placa: string;
  modelo: string | null;
  capacidad: number;
  croquis?: CroquisUnidadDatos;
  creado_en: string;
  actualizado_en: string;
}

export interface CroquisUnidadDatos {
  filas: number | null;
  columnas: number | null;
  celdas: { fila: number; columna: number; tipo: 'conductor' | 'puerta' }[];
}

export interface DatosUnidadCrear {
  placa: string;
  modelo?: string | null;
  capacidad: number;
}

export interface DatosUnidadActualizar {
  placa?: string | null;
  modelo?: string | null;
  capacidad?: number | null;
}
