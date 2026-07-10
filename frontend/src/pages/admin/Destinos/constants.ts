import type { PestaniaFiltro } from '../../../components/admin';
import type { DatosDestinoNuevo } from '../../../types/destino';

export const PESTANIAS_FILTRO: PestaniaFiltro[] = [
  { id: 'todos', etiqueta: 'Todos' },
  { id: 'activo', etiqueta: 'Activos' },
  { id: 'anulado', etiqueta: 'Anulados' },
];

export const ETIQUETA_ESTADO: Record<string, string> = {
  activo: 'Activo',
  inactivo: 'Inactivo',
  anulado: 'Anulado',
};

export const FORM_VACIO: DatosDestinoNuevo = {
  nombre: '',
  descripcion: '',
  precio_base_eur: 0,
  activo: true,
};
