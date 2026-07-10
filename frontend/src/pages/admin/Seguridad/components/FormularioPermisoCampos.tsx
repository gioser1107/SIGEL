import type { FormularioPermiso } from '../constants';

interface FormularioPermisoCamposProps {
  form: FormularioPermiso;
  onChange: (actualizador: (prev: FormularioPermiso) => FormularioPermiso) => void;
}

export default function FormularioPermisoCampos({ form, onChange }: FormularioPermisoCamposProps) {
  return (
    <div className="drawer-form">
      <p className="drawer-form__intro">
        Identificador del permiso usado por el sistema para controlar el acceso.
      </p>
      <div className="drawer-form__campo">
        <label className="drawer-form__label" htmlFor="permiso-descripcion">
          Descripción <span className="drawer-form__req">*</span>
        </label>
        <input
          id="permiso-descripcion"
          className="drawer-form__input"
          placeholder="ej: leer_clientes"
          value={form.descripcion}
          onChange={(e) => onChange((f) => ({ ...f, descripcion: e.target.value }))}
          required
        />
      </div>
    </div>
  );
}
