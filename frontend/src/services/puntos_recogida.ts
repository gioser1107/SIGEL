import apiRequest from './api';
import type {
  ClienteVinculadoPuntoRecogida,
  DatosPuntoRecogidaCatalogo,
  DomicilioRecogidaDTO,
  EditarDomicilioRecogidaDTO,
  FiltrosPuntosRecogidaAdmin,
  PuntoRecogida,
  PuntoRecogidaDetalle,
  PuntoRecogidaListado,
} from '../types/puntoRecogida';
import type { PaginacionQuery, RespuestaPaginada } from '../types/paginacion';
import { agregarPaginacionAParams, normalizarRespuestaPaginada } from '../utils/paginacionApi';

interface ClienteDomicilioApi {
  id?: number;
  cliente_id?: number;
  nombre?: string;
  apellido?: string;
  tipo_documento?: string;
  numero_documento?: string;
  telefono?: string | null;
}

interface DomicilioApiItem extends PuntoRecogida {
  cliente?: ClienteDomicilioApi;
  vinculo_id?: number;
}

interface GrupoDomiciliosCliente {
  cliente_id?: number;
  domicilios?: DomicilioApiItem[];
  cliente?: ClienteDomicilioApi;
}

function clienteDeItem(
  item: DomicilioApiItem,
  grupo?: GrupoDomiciliosCliente,
): ClienteDomicilioApi | undefined {
  return item.cliente ?? grupo?.cliente;
}

function enriquecerFilaListado(
  domicilio: PuntoRecogida,
  grupo?: GrupoDomiciliosCliente,
): PuntoRecogidaListado {
  const item = domicilio as DomicilioApiItem & PuntoRecogidaListado;
  const cliente = clienteDeItem(item, grupo);
  const clienteId =
    item.cliente_id ??
    grupo?.cliente_id ??
    cliente?.id ??
    cliente?.cliente_id;

  return {
    ...domicilio,
    cliente_id: clienteId ?? null,
    cliente_nombre: item.cliente_nombre ?? cliente?.nombre ?? null,
    cliente_apellido: item.cliente_apellido ?? cliente?.apellido ?? null,
    cliente_tipo_documento: item.cliente_tipo_documento ?? cliente?.tipo_documento ?? null,
    cliente_numero_documento: item.cliente_numero_documento ?? cliente?.numero_documento ?? null,
  };
}

function clienteVinculadoDesdeApi(
  cliente: ClienteDomicilioApi,
  esPredeterminado?: boolean,
): ClienteVinculadoPuntoRecogida {
  return {
    cliente_id: cliente.id ?? cliente.cliente_id ?? 0,
    nombre: cliente.nombre ?? '',
    apellido: cliente.apellido ?? '',
    tipo_documento: cliente.tipo_documento,
    numero_documento: cliente.numero_documento,
    es_predeterminado: esPredeterminado,
  };
}

/** Acepta array plano, `{ domicilios }`, `{ cliente_id, domicilios }` o grupos anidados. */
export function aplanarRespuestaDomicilios(data: unknown): PuntoRecogidaListado[] {
  if (Array.isArray(data)) {
    if (data.length === 0) return [];
    const primero = data[0];
    if (primero && typeof primero === 'object' && 'domicilios' in primero) {
      return (data as GrupoDomiciliosCliente[]).flatMap((grupo) =>
        (grupo.domicilios ?? []).map((d) => enriquecerFilaListado(d, grupo)),
      );
    }
    return (data as DomicilioApiItem[]).map((d) => enriquecerFilaListado(d));
  }

  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;

    if (Array.isArray(obj.domicilios)) {
      const grupo: GrupoDomiciliosCliente = {
        cliente_id: typeof obj.cliente_id === 'number' ? obj.cliente_id : undefined,
        domicilios: obj.domicilios as DomicilioApiItem[],
        cliente: obj.cliente as ClienteDomicilioApi,
      };
      return (grupo.domicilios ?? []).map((d) => enriquecerFilaListado(d, grupo));
    }

    for (const key of ['puntos_recogida', 'puntos', 'items', 'data', 'resultados']) {
      if (Array.isArray(obj[key])) {
        return aplanarRespuestaDomicilios(obj[key]);
      }
    }
  }

  return [];
}

function normalizarListaPuntosRecogida<T extends PuntoRecogida>(data: unknown): T[] {
  return aplanarRespuestaDomicilios(data) as T[];
}

function normalizarDetallePuntoRecogida(data: unknown): PuntoRecogidaDetalle {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>;
    const raw = (obj.domicilio ?? obj) as DomicilioApiItem;
    const enriquecido = enriquecerFilaListado(raw);

    const clientesApi = (obj.clientes ?? obj.clientes_vinculados) as
      | ClienteVinculadoPuntoRecogida[]
      | undefined;

    let clientes = clientesApi;
    if (!clientes?.length && raw.cliente) {
      clientes = [clienteVinculadoDesdeApi(raw.cliente, raw.es_predeterminado)];
    }

    return {
      ...enriquecido,
      clientes,
      clientes_vinculados: clientes,
    };
  }
  return data as PuntoRecogidaDetalle;
}

// ─── Listado / consulta admin ───

export async function listarPuntosRecogidaAdmin(
  filtros?: FiltrosPuntosRecogidaAdmin & PaginacionQuery,
): Promise<RespuestaPaginada<PuntoRecogidaListado>> {
  const params = new URLSearchParams();
  if (filtros?.cliente_id) params.set('cliente_id', String(filtros.cliente_id));
  if (filtros?.buscar?.trim()) params.set('buscar', filtros.buscar.trim());
  if (filtros?.solo_activos != null) params.set('solo_activos', filtros.solo_activos ? 'true' : 'false');
  agregarPaginacionAParams(params, filtros);
  const data = await apiRequest<unknown>(`/puntos-recogida?${params.toString()}`, { requiresAuth: true });
  const respuesta = normalizarRespuestaPaginada<unknown>(data, filtros?.limite);
  return {
    ...respuesta,
    items: aplanarRespuestaDomicilios({
      items: respuesta.items,
      total: respuesta.total,
      pagina: respuesta.pagina,
      limite: respuesta.limite,
    }),
  };
}

export async function listarPuntosRecogidaPorClienteAdmin(
  clienteId: number,
): Promise<PuntoRecogida[]> {
  const data = await apiRequest<unknown>(`/puntos-recogida/cliente/${clienteId}`, {
    requiresAuth: true,
  });
  return normalizarListaPuntosRecogida<PuntoRecogida>(data);
}

export async function obtenerDetallePuntoRecogida(id: number): Promise<PuntoRecogidaDetalle> {
  const data = await apiRequest<unknown>(`/puntos-recogida/${id}`, { requiresAuth: true });
  return normalizarDetallePuntoRecogida(data);
}

/** Listado público o legacy (reservas antiguas). Preferir listarPuntosRecogidaAdmin en admin. */
export async function listarPuntosRecogidaCatalogo(
  filtros?: Pick<FiltrosPuntosRecogidaAdmin, 'solo_activos'>,
): Promise<PuntoRecogida[]> {
  const params = new URLSearchParams();
  if (filtros?.solo_activos != null) params.set('solo_activos', filtros.solo_activos ? 'true' : 'false');
  const sufijo = params.toString() ? `?${params.toString()}` : '';
  const data = await apiRequest<unknown>(`/puntos-recogida${sufijo}`, { requiresAuth: false });
  return normalizarListaPuntosRecogida<PuntoRecogida>(data);
}

/** @deprecated El catálogo ya no se crea desde admin. Gestionar domicilios en Clientes. */
export async function crearPuntoRecogidaCatalogo(
  datos: DatosPuntoRecogidaCatalogo,
): Promise<PuntoRecogida> {
  return apiRequest<PuntoRecogida>('/puntos-recogida', {
    method: 'POST',
    requiresAuth: true,
    body: JSON.stringify(datos),
  });
}

/** @deprecated Gestionar domicilios en Clientes. */
export async function editarPuntoRecogidaCatalogo(
  id: number,
  datos: Partial<DatosPuntoRecogidaCatalogo>,
): Promise<PuntoRecogida> {
  return apiRequest<PuntoRecogida>(`/puntos-recogida/${id}`, {
    method: 'PUT',
    requiresAuth: true,
    body: JSON.stringify(datos),
  });
}

/** @deprecated Gestionar domicilios en Clientes. */
export async function eliminarPuntoRecogidaCatalogo(id: number): Promise<{ mensaje: string }> {
  return apiRequest<{ mensaje: string }>(`/puntos-recogida/${id}`, {
    method: 'DELETE',
    requiresAuth: true,
  });
}

/** @deprecated */
export async function obtenerPuntoRecogidaCatalogo(id: number): Promise<PuntoRecogida> {
  return obtenerDetallePuntoRecogida(id);
}

/** @deprecated Los clientes ya no crean puntos libres; usar catálogo admin. */
export async function crearPuntoRecogidaPublico(
  datos: { nombre: string; direccion?: string | null; ciudad?: string | null; estado?: string | null; notas_referencia?: string | null },
): Promise<{ id: number; nombre: string }> {
  return apiRequest<{ id: number; nombre: string }>('/puntos-recogida/publico', {
    method: 'POST',
    requiresAuth: true,
    body: JSON.stringify(datos),
  });
}

// ─── Portal cliente — mi perfil ───

export async function listarMisPuntosRecogida(): Promise<PuntoRecogida[]> {
  const data = await apiRequest<unknown>('/clientes/mi-perfil/puntos-recogida', { requiresAuth: true });
  return normalizarListaPuntosRecogida<PuntoRecogida>(data);
}

export async function agregarMiPuntoRecogida(
  datos: DomicilioRecogidaDTO,
): Promise<{ mensaje: string; punto: PuntoRecogida }> {
  return apiRequest<{ mensaje: string; punto: PuntoRecogida }>('/clientes/mi-perfil/puntos-recogida', {
    method: 'POST',
    requiresAuth: true,
    body: JSON.stringify(datos),
  });
}

export async function editarMiPuntoRecogida(
  puntoId: number,
  datos: EditarDomicilioRecogidaDTO,
): Promise<{ mensaje: string; punto: PuntoRecogida }> {
  return apiRequest<{ mensaje: string; punto: PuntoRecogida }>(
    `/clientes/mi-perfil/puntos-recogida/${puntoId}`,
    {
      method: 'PUT',
      requiresAuth: true,
      body: JSON.stringify(datos),
    },
  );
}

export async function marcarMiPuntoPredeterminado(puntoId: number): Promise<{ mensaje: string }> {
  return apiRequest<{ mensaje: string }>(
    `/clientes/mi-perfil/puntos-recogida/${puntoId}/predeterminado`,
    { method: 'PUT', requiresAuth: true },
  );
}

export async function quitarMiPuntoRecogida(puntoId: number): Promise<{ mensaje: string }> {
  return apiRequest<{ mensaje: string }>(`/clientes/mi-perfil/puntos-recogida/${puntoId}`, {
    method: 'DELETE',
    requiresAuth: true,
  });
}

// ─── Admin — puntos de un cliente ───

export async function listarPuntosRecogidaCliente(clienteId: number): Promise<PuntoRecogida[]> {
  const data = await apiRequest<unknown>(`/clientes/${clienteId}/puntos-recogida`, { requiresAuth: true });
  return normalizarListaPuntosRecogida<PuntoRecogida>(data);
}

export async function agregarPuntoRecogidaCliente(
  clienteId: number,
  datos: DomicilioRecogidaDTO,
): Promise<{ mensaje: string; punto: PuntoRecogida }> {
  return apiRequest<{ mensaje: string; punto: PuntoRecogida }>(
    `/clientes/${clienteId}/puntos-recogida`,
    {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify(datos),
    },
  );
}

export async function editarPuntoRecogidaCliente(
  clienteId: number,
  puntoId: number,
  datos: EditarDomicilioRecogidaDTO,
): Promise<{ mensaje: string; punto: PuntoRecogida }> {
  return apiRequest<{ mensaje: string; punto: PuntoRecogida }>(
    `/clientes/${clienteId}/puntos-recogida/${puntoId}`,
    {
      method: 'PUT',
      requiresAuth: true,
      body: JSON.stringify(datos),
    },
  );
}

export async function marcarPuntoPredeterminadoCliente(
  clienteId: number,
  puntoId: number,
): Promise<{ mensaje: string }> {
  return apiRequest<{ mensaje: string }>(
    `/clientes/${clienteId}/puntos-recogida/${puntoId}/predeterminado`,
    { method: 'PUT', requiresAuth: true },
  );
}

export async function quitarPuntoRecogidaCliente(
  clienteId: number,
  puntoId: number,
): Promise<{ mensaje: string }> {
  return apiRequest<{ mensaje: string }>(`/clientes/${clienteId}/puntos-recogida/${puntoId}`, {
    method: 'DELETE',
    requiresAuth: true,
  });
}

/** @deprecated Usar listarPuntosRecogidaCatalogo */
export const listarPuntosRecogida = listarPuntosRecogidaCatalogo;
