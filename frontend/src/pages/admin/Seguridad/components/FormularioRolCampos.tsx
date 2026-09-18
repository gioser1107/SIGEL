import type { Permiso } from '../../../../types/seguridad';
import type { FormularioRol } from '../constants';
import MatrizPermisosRol from './MatrizPermisosRol';
import { sanitizarNombrePersona } from '../../../../utils/validacionesFormulario';

interface FormularioRolCamposProps {
  form: FormularioRol;
  permisos: Permiso[];
  permisosSeleccionados: Set<number>;
  mostrarMatriz: boolean;
  onChange: (actualizador: (prev: FormularioRol) => FormularioRol) => void;
  onAlternarPermiso: (permisoId: number) => void;
  bloqueado?: boolean;
}

export default function FormularioRolCampos({
  form,
  permisos,
  permisosSeleccionados,
  mostrarMatriz,
  onChange,
  onAlternarPermiso,
  bloqueado = false,
}: FormularioRolCamposProps) {
  return (
    <div className="drawer-form">
      <p className="drawer-form__intro">
        {bloqueado
          ? 'El rol Administrador es intocable: no se puede editar ni quitarle permisos.'
          : 'Define el nombre del rol y qué acciones puede hacer en el panel.'}
      </p>
      <div className="drawer-form__campo">
        <label className="drawer-form__label" htmlFor="rol-nombre">
          Nombre <span className="drawer-form__req">*</span>
        </label>
        <input
          id="rol-nombre"
          className="drawer-form__input"
          value={form.nombre}
          onChange={(e) => onChange((f) => ({ ...f, nombre: sanitizarNombrePersona(e.target.value) }))}
          required
          disabled={bloqueado}
        />
      </div>
      <div className="drawer-form__campo">
        <label className="drawer-form__label" htmlFor="rol-descripcion">Descripción</label>
        <textarea
          id="rol-descripcion"
          className="drawer-form__input drawer-form__textarea"
          value={form.descripcion}
          onChange={(e) => onChange((f) => ({ ...f, descripcion: e.target.value }))}
          disabled={bloqueado}
        />
      </div>

      {mostrarMatriz && (
        <div className="cot-drawer__acciones-estado">
          <p className="cot-drawer__acciones-titulo">Permisos del panel</p>
          <MatrizPermisosRol
            permisos={permisos}
            seleccionados={permisosSeleccionados}
            onAlternar={onAlternarPermiso}
            soloLectura={bloqueado}
          />
        </div>
      )}
    </div>
  );
}
