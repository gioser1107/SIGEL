import type { FormularioMoneda } from '../constants';

interface FormularioMonedaCamposProps {
  form: FormularioMoneda;
  onChange: (form: FormularioMoneda) => void;
}

export default function FormularioMonedaCampos({ form, onChange }: FormularioMonedaCamposProps) {
  return (
    <div className="drawer-form">
      <div className="drawer-form__campo">
        <label className="drawer-form__label" htmlFor="moneda-codigo">Código</label>
        <input
          id="moneda-codigo"
          className="drawer-form__input"
          value={form.codigo}
          onChange={(e) => onChange({ ...form, codigo: e.target.value.toUpperCase() })}
          placeholder="EUR"
        />
      </div>
      <div className="drawer-form__campo">
        <label className="drawer-form__label" htmlFor="moneda-nombre">Nombre</label>
        <input
          id="moneda-nombre"
          className="drawer-form__input"
          value={form.nombre}
          onChange={(e) => onChange({ ...form, nombre: e.target.value })}
          placeholder="Euro"
        />
      </div>
      <div className="drawer-form__campo">
        <label className="drawer-form__label" htmlFor="moneda-simbolo">Símbolo</label>
        <input
          id="moneda-simbolo"
          className="drawer-form__input"
          value={form.simbolo}
          onChange={(e) => onChange({ ...form, simbolo: e.target.value })}
          placeholder="€"
        />
      </div>
    </div>
  );
}
