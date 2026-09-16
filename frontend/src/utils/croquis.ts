export type TipoCeldaCroquis = 'conductor' | 'puerta';

export interface CeldaCroquis {
  fila: number;
  columna: number;
  tipo: TipoCeldaCroquis;
}

export interface CroquisUnidad {
  filas: number | null;
  columnas: number | null;
  celdas: CeldaCroquis[];
}

export interface AsientoEnCroquis {
  id?: number;
  numero: string;
  posicion?: string;
  fila?: number | null;
  columna?: number | null;
  ocupado?: boolean;
}

export interface LayoutCroquis {
  filas: number;
  columnas: number;
  celdas: CeldaCroquis[];
  asientos: Array<AsientoEnCroquis & { fila: number; columna: number }>;
  inferido: boolean;
}

const COLUMNAS_INFERIDAS = 5;

export function celdaEspecialEn(
  celdas: CeldaCroquis[] | undefined,
  fila: number,
  columna: number,
): CeldaCroquis | undefined {
  return (celdas ?? []).find((c) => c.fila === fila && c.columna === columna);
}

export function resolverLayoutCroquis(
  asientos: AsientoEnCroquis[],
  croquis?: CroquisUnidad | null,
  minimo: { filas?: number; columnas?: number } = {},
): LayoutCroquis {
  const celdas = croquis?.celdas ?? [];
  const todosConCoordenadas =
    asientos.length > 0 && asientos.every((a) => a.fila != null && a.columna != null);

  if (todosConCoordenadas) {
    const maxFilaAsiento = Math.max(...asientos.map((a) => a.fila as number));
    const maxColAsiento = Math.max(...asientos.map((a) => a.columna as number));
    const maxFilaCelda = celdas.reduce((m, c) => Math.max(m, c.fila), 0);
    const maxColCelda = celdas.reduce((m, c) => Math.max(m, c.columna), 0);
    return {
      filas: Math.max(
        croquis?.filas ?? 0,
        maxFilaAsiento + 1,
        maxFilaCelda + 1,
        minimo.filas ?? 0,
      ),
      columnas: Math.max(
        croquis?.columnas ?? 0,
        maxColAsiento + 1,
        maxColCelda + 1,
        minimo.columnas ?? 0,
      ),
      celdas,
      asientos: asientos.map((a) => ({ ...a, fila: a.fila as number, columna: a.columna as number })),
      inferido: false,
    };
  }

  if ((croquis?.filas ?? 0) > 0 && (croquis?.columnas ?? 0) > 0 && asientos.length === 0) {
    return {
      filas: Math.max(croquis?.filas ?? 1, minimo.filas ?? 0),
      columnas: Math.max(croquis?.columnas ?? 1, minimo.columnas ?? 0),
      celdas,
      asientos: [],
      inferido: false,
    };
  }

  const posicionados = asientos.map((asiento, indice) => {
    const grupo = indice % 4;
    const fila = Math.floor(indice / 4);
    const columna = grupo < 2 ? grupo : grupo + 1;
    return { ...asiento, fila, columna };
  });
  const filasInferidas = asientos.length === 0 ? (minimo.filas ?? 9) : Math.ceil(asientos.length / 4);

  return {
    filas: Math.max(filasInferidas, minimo.filas ?? 0),
    columnas: Math.max(COLUMNAS_INFERIDAS, minimo.columnas ?? 0),
    celdas,
    asientos: posicionados,
    inferido: asientos.length > 0,
  };
}

export function asientoEnCelda<T extends { fila: number; columna: number }>(
  asientos: T[],
  fila: number,
  columna: number,
): T | undefined {
  return asientos.find((a) => a.fila === fila && a.columna === columna);
}

export function sugerirNumeroAsiento(numeros: string[]): string {
  const usados = new Set(numeros.map((n) => n.toUpperCase()));
  if (!usados.has('A-00')) return 'A-00';
  for (let i = 1; i <= 99; i += 1) {
    const candidato = `A-${String(i).padStart(2, '0')}`;
    if (!usados.has(candidato)) return candidato;
  }
  return `A-${numeros.length + 1}`;
}
