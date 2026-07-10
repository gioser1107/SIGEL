import type { Columna } from '../../../../../components/admin';
import type { Moneda } from '../../../../../types/pagos';

export const columnasMonedas: Columna<Moneda>[] = [
  { id: 'codigo', encabezado: 'Código', accessor: (m) => <strong>{m.codigo}</strong> },
  { id: 'nombre', encabezado: 'Nombre', accessor: (m) => m.nombre },
  { id: 'simbolo', encabezado: 'Símbolo', accessor: (m) => m.simbolo },
];
