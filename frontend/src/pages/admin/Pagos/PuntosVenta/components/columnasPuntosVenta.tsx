import type { Columna } from '../../../../../components/admin';
import { EtiquetaEstado } from '../../../../../components/admin';
import type { PuntoVenta } from '../../../../../types/pagos';

export const columnasPuntosVenta: Columna<PuntoVenta>[] = [
  { id: 'codigo', encabezado: 'Código', accessor: (p) => p.codigo },
  { id: 'nombre', encabezado: 'Nombre', accessor: (p) => p.nombre },
  { id: 'terminal', encabezado: 'Terminal', accessor: (p) => p.numero_terminal },
  {
    id: 'banco',
    encabezado: 'Banco',
    accessor: (p) => p.banco?.nombre ?? 'Banco no asignado',
  },
  {
    id: 'activo',
    encabezado: 'Estado',
    accessor: (p) => (
      <EtiquetaEstado
        etiqueta={p.activo === false ? 'Inactivo' : 'Activo'}
        variante={p.activo === false ? 'neutro' : 'exito'}
      />
    ),
  },
];
