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

export const CATEGORIAS_LINEA = [
  { id: 'combustible', etiqueta: 'Combustible' },
  { id: 'logistica', etiqueta: 'Logística' },
  { id: 'pago_guia', etiqueta: 'Pago guía' },
  { id: 'alimentacion', etiqueta: 'Alimentación' },
  { id: 'peajes', etiqueta: 'Peajes' },
  { id: 'otro', etiqueta: 'Otro' },
];

export const FORM_VACIO: DatosCotizacionNueva = {
  cliente_id: 0,
  destino_id: 0,
  requisitos: '',
  precio_cotizado_eur: null,
  valida_hasta: null,
  estado: 'solicitada',
};

export const LINEA_FORM_VACIO = { categoria: 'otro', monto_eur: '', descripcion: '' };
