/** Contrato estándar de listados paginados (igual que Bitácora). */
export interface RespuestaPaginada<T> {
  items: T[];
  total: number;
  pagina: number;
  limite: number;
}

export type FiltroListado = 'todos' | 'anulado' | string;

export interface PaginacionQuery {
  pagina?: number;
  limite?: number;
  filtro?: FiltroListado;
}

export const LIMITE_PAGINA_DEFAULT = 10;
export const LIMITE_PAGINA_MAX = 200;
/** Máximo permitido por el API del portal de mis reservas. */
export const LIMITE_PAGINA_PORTAL_RESERVAS = 50;
