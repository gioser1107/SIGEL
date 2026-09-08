import type { Columna } from '../../../../components/admin';
import type { UsuarioSistema } from '../../../../types/seguridad';
import { nombreCompleto } from '../../../../utils/nombrePersona';
import { iniciales } from '../utils/iniciales';
import './TablaUsuarios.css';

export const columnasUsuarios: Columna<UsuarioSistema>[] = [
  {
    id: 'nombre',
    encabezado: 'Usuario',
    accessor: (u) => (
      <div className="seguridad__celda-usuario">
        <span className="seguridad__avatar">{iniciales(nombreCompleto(u.nombre, u.apellido))}</span>
        <span>{nombreCompleto(u.nombre, u.apellido)}</span>
      </div>
    ),
  },
  {
    id: 'correo',
    encabezado: 'Correo',
    accessor: (u) => (
      <span className="seguridad__celda-correo">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
        {u.correo}
      </span>
    ),
  },
  {
    id: 'rol',
    encabezado: 'Rol',
    accessor: (u) => (
      <span
        className={`seguridad__insignia-rol${u.rol.trim().toLowerCase() === 'cliente' ? ' seguridad__insignia-rol--cliente' : ''}`}
      >
        {u.rol}
      </span>
    ),
  },
];
