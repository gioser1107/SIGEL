import type { DatosCotizacionNueva } from '../../../types/cotizacion';
import type { PestaniaFiltro } from '../../../components/admin';

export const PESTANIAS_FILTRO: PestaniaFiltro[] = [
  { id: 'todos', etiqueta: 'Todas' },
  { id: 'pendientes', etiqueta: 'Pendientes' },
  { id: 'activas', etiqueta: 'Activas' },
  { id: 'vencidas', etiqueta: 'Vencidas' },
  { id: 'anulado', etiqueta: 'Anuladas' },
];

export const ETIQUETA_ESTADO: Record<string, string> = {
  solicitada: 'Solicitada',
  pendiente: 'Pendiente',
  aceptada: 'Aceptada',
  vencida: 'Vencida',
  cancelada: 'Cancelada',
};

export const ESTADOS_COTIZACION = ['solicitada', 'pendiente', 'aceptada', 'vencida', 'cancelada'] as const;

export const UNIDADES_LINEA = [
  { id: 'personas', etiqueta: 'Personas' },
  { id: 'noches', etiqueta: 'Noches' },
  { id: 'servicios', etiqueta: 'Servicios' },
  { id: 'unidades', etiqueta: 'Unidades' },
] as const;

export const FORM_VACIO: DatosCotizacionNueva = {
  cliente_id: 0,
  destino_id: 0,
  requisitos: '',
  precio_cotizado_eur: null,
  valida_hasta: null,
  modalidad: 'individual',
};

export const LINEA_FORM_VACIO = {
  concepto: '',
  cantidad: '1',
  unidad: 'personas',
  precio_unitario_eur: '',
};

export type LineaFormCotizacion = typeof LINEA_FORM_VACIO;
