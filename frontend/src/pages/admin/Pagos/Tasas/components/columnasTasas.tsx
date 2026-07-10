import type { Columna } from '../../../../../components/admin';
import type { TasaCambio } from '../../../../../types/pagos';

export const columnasTasas: Columna<TasaCambio>[] = [
  { id: 'fecha', encabezado: 'Fecha', accessor: (t) => t.fecha },
  {
    id: 'moneda',
    encabezado: 'Moneda',
    accessor: (t) => `${t.moneda.codigo} (${t.moneda.nombre})`,
  },
  {
    id: 'valor',
    encabezado: 'Valor (Bs/€)',
    accessor: (t) => t.valor.toLocaleString('es-ES', { minimumFractionDigits: 2 }),
  },
];
