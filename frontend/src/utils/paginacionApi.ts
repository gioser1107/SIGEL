import type { PaginacionQuery, RespuestaPaginada } from '../types/paginacion';
import { LIMITE_PAGINA_DEFAULT, LIMITE_PAGINA_MAX } from '../types/paginacion';

export { LIMITE_PAGINA_DEFAULT, LIMITE_PAGINA_MAX };

export function clampLimite(limite?: number): number {
  if (limite == null || limite < 1) return LIMITE_PAGINA_DEFAULT;
  return Math.min(limite, LIMITE_PAGINA_MAX);
}

export function agregarPaginacionAParams(
  params: URLSearchParams,
  query?: PaginacionQuery,
): URLSearchParams {
  const pagina = query?.pagina ?? 1;
  const limite = clampLimite(query?.limite);
  params.set('pagina', String(Math.max(1, pagina)));
  params.set('limite', String(limite));
  if (query?.filtro) {
    params.set('filtro', query.filtro);
  }
  if (query?.buscar?.trim()) {
    params.set('buscar', query.buscar.trim());
  }
  return params;
}

/** Normaliza respuesta paginada o array legacy. */
export function normalizarRespuestaPaginada<T>(
  data: unknown,
  limiteFallback = LIMITE_PAGINA_DEFAULT,
): RespuestaPaginada<T> {
  if (Array.isArray(data)) {
    return {
      items: data as T[],
      total: data.length,
      pagina: 1,
      limite: data.length > 0 ? data.length : limiteFallback,
    };
  }

  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    const candidatos = [obj.items, obj.domicilios, obj.puntos_recogida, obj.data, obj.resultados];
    const items = candidatos.find(Array.isArray) as T[] | undefined;

    if (items) {
      return {
        items,
        total: typeof obj.total === 'number' ? obj.total : items.length,
        pagina: typeof obj.pagina === 'number' ? obj.pagina : 1,
        limite: typeof obj.limite === 'number' ? obj.limite : limiteFallback,
      };
    }
  }

  return { items: [], total: 0, pagina: 1, limite: limiteFallback };
}

export function totalPaginas(total: number, limite: number): number {
  return Math.max(1, Math.ceil(total / clampLimite(limite)));
}

/** Para selects y formularios que necesitan el catálogo completo (máx. 200). */
export async function listarItemsParaSelect<T>(
  fetcher: (query: PaginacionQuery) => Promise<RespuestaPaginada<T>>,
): Promise<T[]> {
  const { items } = await fetcher({ pagina: 1, limite: LIMITE_PAGINA_MAX });
  return items;
}
