import type { Columna } from '../../../../components/admin';
import type { Rol } from '../../../../types/seguridad';

export const columnasRoles: Columna<Rol>[] = [
  {
    id: 'nombre',
    encabezado: 'Rol',
    accessor: (r) => <strong>{r.nombre}</strong>,
  },
  {
    id: 'descripcion',
    encabezado: 'Descripción',
    accessor: (r) => r.descripcion || '—',
  },
];
