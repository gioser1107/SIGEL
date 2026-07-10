import type { Columna } from '../../../../../components/admin';
import type { MetodoPago } from '../../../../../types/pagos';
import { etiquetaMetodoCorta } from '../../../Reservas/Pagos/utils/metodosPagoUi';

export const columnasMetodosPago: Columna<MetodoPago>[] = [
  { id: 'codigo', encabezado: 'Código', accessor: (m) => <code>{m.codigo}</code> },
  { id: 'nombre', encabezado: 'Nombre', accessor: (m) => etiquetaMetodoCorta(m) },
  {
    id: 'moneda',
    encabezado: 'Moneda',
    accessor: (m) => `${m.moneda.simbolo} ${m.moneda.codigo}`,
  },
];
