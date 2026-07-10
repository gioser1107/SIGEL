import type { Moneda } from '../../../../../types/pagos';
import { CODIGOS_METODO_SUGERIDOS } from '../../constants';
import type { FormularioMetodoPago } from '../constants';

interface FormularioMetodoPagoCamposProps {
  form: FormularioMetodoPago;
  monedas: Moneda[];
  onChange: (form: FormularioMetodoPago) => void;
}

export default function FormularioMetodoPagoCampos({ form, monedas, onChange }: FormularioMetodoPagoCamposProps) {
  return (
    <div className="drawer-form">
      <div className="drawer-form__campo">
        <label className="drawer-form__label" htmlFor="metodo-codigo">Código</label>
        <input
          id="metodo-codigo"
          className="drawer-form__input"
          list="codigos-metodo"
          value={form.codigo}
          onChange={(e) => onChange({ ...form, codigo: e.target.value })}
          placeholder="transferencia"
        />
        <datalist id="codigos-metodo">
          {CODIGOS_METODO_SUGERIDOS.map((c) => <option key={c} value={c} />)}
        </datalist>
      </div>
      <div className="drawer-form__campo">
        <label className="drawer-form__label" htmlFor="metodo-nombre">Nombre</label>
        <input
          id="metodo-nombre"
          className="drawer-form__input"
          value={form.nombre}
          onChange={(e) => onChange({ ...form, nombre: e.target.value })}
        />
      </div>
      <div className="drawer-form__campo">
        <label className="drawer-form__label" htmlFor="metodo-moneda">Moneda</label>
        <select
          id="metodo-moneda"
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
    </div>
  );
}
