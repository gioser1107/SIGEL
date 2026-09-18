import type { FormularioBanco } from '../constants';

interface FormularioBancoCamposProps {
  form: FormularioBanco;
  onChange: (form: FormularioBanco) => void;
}

export default function FormularioBancoCampos({ form, onChange }: FormularioBancoCamposProps) {
  return (
    <div className="drawer-form">
      <div className="drawer-form__campo">
        <label className="drawer-form__label" htmlFor="banco-codigo">
          Código <span className="drawer-form__req">*</span>
        </label>
        <input
          id="banco-codigo"
          className="drawer-form__input"
          value={form.codigo}
          inputMode="numeric"
          maxLength={4}
          onChange={(e) => onChange({ ...form, codigo: e.target.value.replace(/\D/g, '').slice(0, 4) })}
          placeholder="0102"
        />
        <p className="drawer-form__ayuda">Solo 4 dígitos, sin letras.</p>
      </div>
      <div className="drawer-form__campo">
        <label className="drawer-form__label" htmlFor="banco-nombre">Nombre</label>
        <input
          id="banco-nombre"
          className="drawer-form__input"
          value={form.nombre}
          onChange={(e) => onChange({ ...form, nombre: e.target.value })}
        />
      </div>
      <div className="drawer-form__campo">
        <label className="drawer-form__label" htmlFor="banco-activo">
          <input
            id="banco-activo"
            type="checkbox"
            checked={form.activo}
            onChange={(e) => onChange({ ...form, activo: e.target.checked })}
          />
          {' '}Activo
        </label>
      </div>
    </div>
  );
}
