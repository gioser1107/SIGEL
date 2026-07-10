import type { Banco } from '../../../../../types/pagos';
import type { FormularioPuntoVenta } from '../constants';

interface FormularioPuntoVentaCamposProps {
  form: FormularioPuntoVenta;
  bancos: Banco[];
  onChange: (form: FormularioPuntoVenta) => void;
}

export default function FormularioPuntoVentaCampos({ form, bancos, onChange }: FormularioPuntoVentaCamposProps) {
  return (
    <div className="drawer-form">
      <div className="drawer-form__campo">
        <label className="drawer-form__label" htmlFor="tpv-banco">Banco</label>
        <select
          id="tpv-banco"
          className="drawer-form__input"
          value={form.banco_id}
          onChange={(e) => onChange({ ...form, banco_id: e.target.value })}
        >
          <option value="">Seleccionar…</option>
          {bancos.map((b) => (
            <option key={b.id} value={b.id}>{b.codigo} — {b.nombre}</option>
          ))}
        </select>
      </div>
      <div className="drawer-form__fila-2">
        <div className="drawer-form__campo">
          <label className="drawer-form__label" htmlFor="tpv-codigo">Código</label>
          <input
            id="tpv-codigo"
            className="drawer-form__input"
            value={form.codigo}
            onChange={(e) => onChange({ ...form, codigo: e.target.value })}
          />
        </div>
        <div className="drawer-form__campo">
          <label className="drawer-form__label" htmlFor="tpv-terminal">Nº terminal</label>
          <input
            id="tpv-terminal"
            className="drawer-form__input"
            value={form.numero_terminal}
            onChange={(e) => onChange({ ...form, numero_terminal: e.target.value })}
          />
        </div>
      </div>
      <div className="drawer-form__campo">
        <label className="drawer-form__label" htmlFor="tpv-nombre">Nombre</label>
        <input
          id="tpv-nombre"
          className="drawer-form__input"
          value={form.nombre}
          onChange={(e) => onChange({ ...form, nombre: e.target.value })}
        />
      </div>
      <div className="drawer-form__campo">
        <label className="drawer-form__label" htmlFor="tpv-activo">
          <input
            id="tpv-activo"
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
