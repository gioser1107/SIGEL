import type { Columna } from '../../../../../components/admin';
import { EtiquetaEstado } from '../../../../../components/admin';
import type { Banco } from '../../../../../types/pagos';

export const columnasBancos: Columna<Banco>[] = [
  { id: 'codigo', encabezado: 'Código', accessor: (b) => <code>{b.codigo}</code> },
  { id: 'nombre', encabezado: 'Nombre', accessor: (b) => b.nombre },
  {
    id: 'activo',
    encabezado: 'Estado',
    accessor: (b) => (
      <EtiquetaEstado
        etiqueta={b.activo === false ? 'Inactivo' : 'Activo'}
        variante={b.activo === false ? 'neutro' : 'exito'}
      />
    ),
  },
];
