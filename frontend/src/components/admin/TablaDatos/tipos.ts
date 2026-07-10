import type { ReactNode } from 'react';

export interface Columna<T> {
  id: string;
  encabezado: string;
  accessor: (fila: T) => ReactNode;
  ordenable?: boolean;
  ancho?: string;
  alineacion?: 'left' | 'center' | 'right';
}

export interface PropsTablaDatos<T> {
  columnas: Columna<T>[];
  datos: T[];
  cargando?: boolean;
  mensajeVacio?: string;
  accionesVacio?: ReactNode;
  seleccionMultiple?: boolean;
  filasSeleccionadas?: Set<string | number>;
  onSeleccionChange?: (ids: Set<string | number>) => void;
  ordenActual?: { columna: string; direccion: 'asc' | 'desc' } | null;
  onOrdenar?: (columnaId: string, direccion: 'asc' | 'desc') => void;
  accionesFila?: (fila: T) => ReactNode;
  onFilaClick?: (fila: T) => void;
  idFila?: (fila: T) => string | number;
}
