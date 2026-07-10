import type { Columna } from '../../../../components/admin';
import type { Permiso } from '../../../../types/seguridad';
import { etiquetaModulo, parsearDescripcionPermiso } from '../../../../utils/permisosModulos';
import './TablaPermisos.css';

export const columnasPermisos: Columna<Permiso>[] = [
  {
    id: 'modulo',
    encabezado: 'Módulo',
    accessor: (p) => {
      const { modulo } = parsearDescripcionPermiso(p.descripcion);
      return etiquetaModulo(modulo);
    },
  },
  {
    id: 'descripcion',
    encabezado: 'Permiso',
    accessor: (p) => <code className="seguridad__permiso-nombre">{p.descripcion}</code>,
  },
];
