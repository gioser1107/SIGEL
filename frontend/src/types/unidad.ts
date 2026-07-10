export interface UnidadTransporte {
  id: number;
  placa: string;
  modelo: string | null;
  capacidad: number;
  creado_en: string;
  actualizado_en: string;
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
