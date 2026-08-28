import type { Moneda } from '../../../../../types/pagos';
import type { FormularioTasa } from '../constants';
import { fechaHoyIso } from '../../../../../utils/validacionesFormulario';

interface FormularioTasaCamposProps {
  form: FormularioTasa;
  monedas: Moneda[];
  onChange: (form: FormularioTasa) => void;
}

export default function FormularioTasaCampos({ form, monedas, onChange }: FormularioTasaCamposProps) {
  return (
    <div className="drawer-form">
      <div className="drawer-form__campo">
        <label className="drawer-form__label" htmlFor="tasa-fecha">Fecha</label>
        <input
          id="tasa-fecha"
          type="date"
          className="drawer-form__input"
          value={form.fecha}
          max={fechaHoyIso()}
          onChange={(e) => onChange({ ...form, fecha: e.target.value })}
        />
      </div>
      <div className="drawer-form__campo">
        <label className="drawer-form__label" htmlFor="tasa-moneda">Moneda</label>
        <select
          id="tasa-moneda"
          className="drawer-form__input"
          value={form.moneda_id}
          onChange={(e) => onChange({ ...form, moneda_id: e.target.value })}
        >
          <option value="">Seleccionar…</option>
          {monedas.map((m) => (
            <option key={m.id} value={m.id}>{m.codigo} — {m.nombre}</option>
          ))}
        </select>
      </div>
      <div className="drawer-form__campo">
        <label className="drawer-form__label" htmlFor="tasa-valor">Valor (Bs por 1 unidad)</label>
        <input
          id="tasa-valor"
          type="number"
          min="0"
          step="0.01"
          className="drawer-form__input"
          value={form.valor}
          onChange={(e) => onChange({ ...form, valor: e.target.value })}
          placeholder="45.00"
        />
      </div>
    </div>
  );
}
