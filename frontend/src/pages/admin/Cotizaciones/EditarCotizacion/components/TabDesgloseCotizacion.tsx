import Boton from '../../../../../components/ui/Boton/Boton';
import type { Cotizacion, CotizacionLinea, DatosCotizacionNueva } from '../../../../../types/cotizacion';
import { CATEGORIAS_LINEA } from '../../constants';
import { esBloqueada } from '../../utils/formatearCotizacion';

interface PropsLineaForm {
  categoria: string;
  monto_eur: string;
  descripcion: string;
}

interface PropsTabDesglose {
  cotizacion: Cotizacion;
  form: DatosCotizacionNueva;
  lineas: CotizacionLinea[];
  lineaForm: PropsLineaForm;
  cargando: boolean;
  onLineaFormChange: (form: PropsLineaForm) => void;
  onAgregarLinea: () => void;
  onQuitarLinea: (lineaId: number) => void;
}

// Pestaña Desglose: tabla de líneas por categoría y formulario para agregar gastos
export default function TabDesgloseCotizacion({
  cotizacion,
  form,
  lineas,
  lineaForm,
  cargando,
  onLineaFormChange,
  onAgregarLinea,
  onQuitarLinea,
}: PropsTabDesglose) {
  const bloqueada = esBloqueada(cotizacion.estado);

  if (cargando) {
    return <p>Cargando desglose...</p>;
  }

  return (
    <div className="cot-desglose">
      <p className="drawer-form__intro">
        Agrega líneas por categoría. El precio total se calcula automáticamente.
      </p>

      <table className="cot-desglose__tabla">
        <thead>
          <tr>
            <th>Categoría</th>
            <th>Monto EUR</th>
            <th>Descripción</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {lineas.length === 0 && (
            <tr>
              <td colSpan={4}>Sin líneas. Agrega la primera abajo.</td>
            </tr>
          )}
          {lineas.map((l) => (
            <tr key={l.id}>
              <td>{l.categoria}</td>
              <td>€ {l.monto_eur.toFixed(2)}</td>
              <td>{l.descripcion ?? '—'}</td>
              <td>
                <button
                  type="button"
                  className="cot-desglose__quitar"
                  onClick={() => onQuitarLinea(l.id)}
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {!bloqueada && (
        <div className="cot-desglose__form">
          <select
            className="drawer-form__input"
            value={lineaForm.categoria}
            onChange={(e) => onLineaFormChange({ ...lineaForm, categoria: e.target.value })}
          >
            {CATEGORIAS_LINEA.map((c) => (
              <option key={c.id} value={c.id}>
                {c.etiqueta}
              </option>
            ))}
          </select>
          <input
            className="drawer-form__input"
            type="number"
            min={0}
            step={0.01}
            placeholder="Monto EUR"
            value={lineaForm.monto_eur}
            onChange={(e) => onLineaFormChange({ ...lineaForm, monto_eur: e.target.value })}
          />
          <input
            className="drawer-form__input"
            type="text"
            placeholder="Descripción"
            value={lineaForm.descripcion}
            onChange={(e) => onLineaFormChange({ ...lineaForm, descripcion: e.target.value.slice(0, 255) })}
            maxLength={255}
          />
          <Boton variante="secundario" tamano="sm" onClick={onAgregarLinea}>
            Agregar
          </Boton>
        </div>
      )}

      <p className="cot-desglose__total">
        Total: € {(form.precio_cotizado_eur ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
      </p>
    </div>
  );
}
