import type { Columna } from '../../../../../components/admin';
import type { TasaCambio } from '../../../../../types/pagos';

function etiquetaOrigen(origen?: TasaCambio['origen']) {
  return origen === 'bcv' ? 'BCV' : 'Manual';
}

export const columnasTasas: Columna<TasaCambio>[] = [
  { id: 'fecha', encabezado: 'Fecha', accessor: (t) => t.fecha },
  {
    id: 'moneda',
    encabezado: 'Moneda',
    accessor: (t) => `${t.moneda.codigo} (${t.moneda.nombre})`,
  },
  {
    id: 'valor',
    encabezado: 'Valor (Bs/unidad)',
    accessor: (t) => t.valor.toLocaleString('es-VE', { minimumFractionDigits: 2 }),
  },
  {
    id: 'origen',
    encabezado: 'Carga',
    accessor: (t) => etiquetaOrigen(t.origen),
  },
];
