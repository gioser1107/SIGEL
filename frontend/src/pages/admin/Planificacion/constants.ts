import type { PestaniaFiltro, PestaniaPanel } from '../../../components/admin';
import type { DatosViajeNuevo } from '../../../types/viaje';

export const ESTADOS_VIAJE = ['planificado', 'en_curso', 'finalizado', 'cancelado'];

export const ETIQUETA_ESTADO: Record<string, string> = {
  planificado: 'Planificado',
  en_curso: 'En curso',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
};

export const CATEGORIAS_COSTO = [
  'combustible',
  'logistica',
  'pago_guia',
  'alimentacion',
  'peajes',
  'otro',
] as const;

export const ETIQUETA_CATEGORIA_COSTO: Record<string, string> = {
  combustible: 'Combustible',
  logistica: 'Logística',
  pago_guia: 'Pago al guía',
  alimentacion: 'Alimentación',
  peajes: 'Peajes',
  otro: 'Otro',
};

export const PESTANIAS_FILTRO: PestaniaFiltro[] = [
  { id: 'todos', etiqueta: 'Todos' },
  { id: 'planificado', etiqueta: 'Planificados' },
  { id: 'en_curso', etiqueta: 'En curso' },
  { id: 'finalizado', etiqueta: 'Finalizados' },
  { id: 'anulado', etiqueta: 'Anulados' },
];

export const PESTANIAS_PANEL: PestaniaPanel[] = [
  { id: 'info', etiqueta: 'Datos del viaje' },
  { id: 'paradas', etiqueta: 'Ruta de recogida' },
  { id: 'costos', etiqueta: 'Gastos operativos' },
];

export const FORM_VACIO: DatosViajeNuevo = {
  destino_id: 0,
  unidad_id: 0,
  guias_ids: [],
  guia_principal_id: null,
  fecha_salida: '',
  fecha_regreso: null,
  estado: 'planificado',
};

export const COSTO_VACIO = { categoria: 'combustible', monto_eur: '', descripcion: '' };
