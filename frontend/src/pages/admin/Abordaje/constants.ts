import type { PestaniaFiltro } from '../../../components/admin';
import type { EstadoAbordaje } from '../../../types/abordaje';

export const MODULO = 'abordaje';

export const PESTANIAS_ESTADO_ABORDAJE: PestaniaFiltro[] = [
  { id: 'todos', etiqueta: 'Todos' },
  { id: 'pendiente', etiqueta: 'Pendientes' },
  { id: 'abordado', etiqueta: 'Abordados' },
  { id: 'no_presentado', etiqueta: 'No presentados' },
];

export const ETIQUETA_ESTADO_ABORDAJE: Record<EstadoAbordaje, string> = {
  pendiente: 'Pendiente',
  abordado: 'Abordado',
  no_presentado: 'No presentado',
};

export const ESTADOS_VIAJE_SELECTOR = [
  { id: '', etiqueta: 'Todos los estados' },
  { id: 'planificado', etiqueta: 'Planificado' },
  { id: 'en_curso', etiqueta: 'En curso' },
  { id: 'finalizado', etiqueta: 'Finalizado' },
];
