import type { Columna } from '../../../../components/admin';
import type { Rol } from '../../../../types/seguridad';
import { esRolAdministrador } from '../../../../utils/permisosModulos';

export const columnasRoles: Columna<Rol>[] = [
  {
    id: 'nombre',
    encabezado: 'Rol',
    accessor: (r) => (
      <strong>
        {r.nombre}
        {(r.intocable || esRolAdministrador(r.nombre)) && (
          <span className="seguridad__insignia-rol" style={{ marginLeft: '0.45rem' }}>
            Intocable
          </span>
        )}
      </strong>
    ),
  },
  {
    id: 'descripcion',
    encabezado: 'Descripción',
    accessor: (r) => r.descripcion || '—',
  },
];
