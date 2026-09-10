import Boton from '../../../../../components/ui/Boton/Boton';
import type { Costo } from '../../../../../types/viaje';
import { CATEGORIAS_COSTO, ETIQUETA_CATEGORIA_COSTO } from '../../constants';

interface PropsNuevoCosto {
  categoria: string;
  monto_eur: string;
  descripcion: string;
}

interface PropsTabCostos {
  costos: Costo[];
  totalEur: number;
  cargando: boolean;
  nuevoCosto: PropsNuevoCosto;
  guardando: boolean;
  onNuevoCostoChange: (costo: PropsNuevoCosto) => void;
  onAgregar: () => void;
  onEliminar: (costoId: number) => void;
}

// Pestaña Costos: resumen, barras por categoría, tabla y formulario de gastos
export default function TabCostos({
  costos,
  totalEur,
  cargando,
  nuevoCosto,
  guardando,
  onNuevoCostoChange,
  onAgregar,
  onEliminar,
}: PropsTabCostos) {
  if (cargando) {
    return <p className="drawer-paradas__cargando">Cargando costos…</p>;
  }

  return (
    <div className="drawer-costos">
      <p className="drawer-form__intro">
        Registra los gastos internos del viaje: combustible, peajes, pago al guía y similares.
      </p>

      <div className="drawer-costos__total">
        <span>Total operativo</span>
        <strong>€ {totalEur.toFixed(2)}</strong>
      </div>

      {costos.length > 0 && (
        <div className="drawer-costos__barras">
          {CATEGORIAS_COSTO.map((cat) => {
            const totalCat = costos
              .filter((c) => c.categoria === cat)
              .reduce((s, c) => s + c.monto_eur, 0);
            if (totalCat === 0) return null;
            const pct = totalEur > 0 ? (totalCat / totalEur) * 100 : 0;
            return (
              <div key={cat} className="drawer-costos__barra-fila">
                <span className="drawer-costos__barra-cat">
                  {ETIQUETA_CATEGORIA_COSTO[cat] ?? cat}
                </span>
                <div className="drawer-costos__barra-contenedor">
                  <div className="drawer-costos__barra-fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="drawer-costos__barra-monto">€ {totalCat.toFixed(0)}</span>
              </div>
            );
          })}
        </div>
      )}

      {costos.length === 0 && <p className="drawer-paradas__vacio">Sin costos registrados.</p>}

      {costos.length > 0 && (
        <table className="drawer-paradas__tabla">
          <thead>
            <tr>
              <th>Concepto</th>
              <th>Monto</th>
              <th>Detalle</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {costos.map((c) => (
              <tr key={c.id}>
                <td>{ETIQUETA_CATEGORIA_COSTO[c.categoria] ?? c.categoria}</td>
                <td>€ {c.monto_eur.toFixed(2)}</td>
                <td>{c.descripcion ?? '—'}</td>
                <td>
                  <button
                    type="button"
                    className="drawer-paradas__btn-del"
                    onClick={() => onEliminar(c.id)}
                    title="Eliminar costo"
                    aria-label={`Eliminar costo ${c.id}`}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="drawer-paradas__nueva">
        <h4>Agregar gasto</h4>
        <div className="drawer-form__fila-2">
          <div className="drawer-form__campo">
            <label className="drawer-form__label">Concepto</label>
            <select
              className="drawer-form__input"
              value={nuevoCosto.categoria}
              onChange={(e) => onNuevoCostoChange({ ...nuevoCosto, categoria: e.target.value })}
            >
              {CATEGORIAS_COSTO.map((c) => (
                <option key={c} value={c}>
                  {ETIQUETA_CATEGORIA_COSTO[c] ?? c}
                </option>
              ))}
            </select>
          </div>
          <div className="drawer-form__campo">
            <label className="drawer-form__label">Monto (€)</label>
            <input
              className="drawer-form__input"
              type="number"
              min={0}
              step={0.01}
              placeholder="0.00"
              value={nuevoCosto.monto_eur}
              onChange={(e) => onNuevoCostoChange({ ...nuevoCosto, monto_eur: e.target.value })}
            />
          </div>
        </div>
        <div className="drawer-form__campo">
          <label className="drawer-form__label">Detalle</label>
          <input
            className="drawer-form__input"
            type="text"
            placeholder="Ej: Combustible ida y vuelta Morrocoy"
            value={nuevoCosto.descripcion}
            onChange={(e) => onNuevoCostoChange({ ...nuevoCosto, descripcion: e.target.value.slice(0, 255) })}
            maxLength={255}
          />
        </div>
        <Boton variante="secundario" tamano="sm" onClick={onAgregar} disabled={guardando}>
          {guardando ? 'Guardando…' : '+ Agregar costo'}
        </Boton>
      </div>
    </div>
  );
}
