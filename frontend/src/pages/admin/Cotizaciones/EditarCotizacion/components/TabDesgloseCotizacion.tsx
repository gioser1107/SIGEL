import Boton from '../../../../../components/ui/Boton/Boton';
import CampoMonto from '../../../../../components/ui/CampoMonto/CampoMonto';
import type { Cotizacion, CotizacionLinea, DatosCotizacionNueva } from '../../../../../types/cotizacion';
import { UNIDADES_LINEA, type LineaFormCotizacion } from '../../constants';
import {
  esBloqueada,
  etiquetaUnidadCorta,
  formatearCantidad,
  formatearMonedaEur,
  importeDesdeCantidadYPrecio,
} from '../../utils/formatearCotizacion';

interface PropsTabDesglose {
  cotizacion: Cotizacion;
  form: DatosCotizacionNueva;
  lineas: CotizacionLinea[];
  lineaForm: LineaFormCotizacion;
  cargando: boolean;
  onLineaFormChange: (form: LineaFormCotizacion) => void;
  onAgregarLinea: () => void;
  onQuitarLinea: (lineaId: number) => void;
}

function conceptoDeLinea(linea: CotizacionLinea): string {
  return linea.concepto?.trim() || 'Servicio';
}

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
  const importeNuevo = importeDesdeCantidadYPrecio(
    lineaForm.cantidad,
    lineaForm.precio_unitario_eur,
  );
  const total =
    lineas.length > 0
      ? lineas.reduce((suma, l) => suma + l.monto_eur, 0)
      : (form.precio_cotizado_eur ?? 0);

  if (cargando) {
    return <p>Cargando ítems…</p>;
  }

  return (
    <div className="cot-desglose">
      <p className="drawer-form__intro">
        Cada ítem se cobra como en una factura: concepto, cantidad y precio unitario. El importe y
        el total se calculan solos.
      </p>

      <div className="cot-factura">
        <table className="cot-desglose__tabla cot-factura__tabla">
          <thead>
            <tr>
              <th className="cot-factura__col-num">#</th>
              <th>Concepto</th>
              <th className="cot-factura__col-num">Cant.</th>
              <th>Und.</th>
              <th className="cot-factura__col-monto">P. unitario</th>
              <th className="cot-factura__col-monto">Importe</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lineas.length === 0 && (
              <tr>
                <td colSpan={7} className="cot-factura__vacio">
                  Sin ítems. Agrega el primero abajo.
                </td>
              </tr>
            )}
            {lineas.map((l, indice) => (
              <tr key={l.id}>
                <td className="cot-factura__col-num">{indice + 1}</td>
                <td>{conceptoDeLinea(l)}</td>
                <td className="cot-factura__col-num">{formatearCantidad(l.cantidad)}</td>
                <td>{etiquetaUnidadCorta(l.unidad)}</td>
                <td className="cot-factura__col-monto">
                  {formatearMonedaEur(l.precio_unitario_eur)}
                </td>
                <td className="cot-factura__col-monto">{formatearMonedaEur(l.monto_eur)}</td>
                <td>
                  {!bloqueada && (
                    <button
                      type="button"
                      className="cot-desglose__quitar"
                      onClick={() => onQuitarLinea(l.id)}
                      aria-label="Quitar ítem"
                    >
                      ×
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="cot-factura__totales">
          <div className="cot-factura__total-fila">
            <span>Subtotal</span>
            <strong>{formatearMonedaEur(total)}</strong>
          </div>
          <div className="cot-factura__total-fila cot-factura__total-fila--final">
            <span>Total</span>
            <strong>{formatearMonedaEur(total)}</strong>
          </div>
        </div>
      </div>

      {!bloqueada && (
        <div className="cot-desglose__form cot-factura__form">
          <input
            className="drawer-form__input cot-factura__concepto-input"
            type="text"
            placeholder="Concepto (ej. Pasaje adulto)"
            value={lineaForm.concepto}
            onChange={(e) =>
              onLineaFormChange({ ...lineaForm, concepto: e.target.value.slice(0, 255) })
            }
            maxLength={255}
          />
          <select
            className="drawer-form__input"
            value={lineaForm.unidad}
            onChange={(e) => onLineaFormChange({ ...lineaForm, unidad: e.target.value })}
            aria-label="Unidad"
          >
            {UNIDADES_LINEA.map((u) => (
              <option key={u.id} value={u.id}>
                {u.etiqueta}
              </option>
            ))}
          </select>
          <input
            className="drawer-form__input"
            type="number"
            min={0.01}
            step={1}
            placeholder="Cant."
            value={lineaForm.cantidad}
            onChange={(e) => onLineaFormChange({ ...lineaForm, cantidad: e.target.value })}
            aria-label="Cantidad"
          />
          <CampoMonto
            className="drawer-form__input"
            placeholder="P. unitario EUR"
            value={lineaForm.precio_unitario_eur}
            onTexto={(texto) => onLineaFormChange({ ...lineaForm, precio_unitario_eur: texto })}
            aria-label="Precio unitario"
          />
          <p className="cot-factura__importe-vivo">
            {importeNuevo > 0 ? formatearMonedaEur(importeNuevo) : '—'}
          </p>
          <Boton variante="secundario" tamano="sm" onClick={onAgregarLinea}>
            Agregar
          </Boton>
        </div>
      )}
    </div>
  );
}
