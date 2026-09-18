import { EtiquetaEstado, resolverVariante } from '../../../../../components/admin';
import Boton from '../../../../../components/ui/Boton/Boton';
import type { Cotizacion, DatosCotizacionNueva } from '../../../../../types/cotizacion';
import { ETIQUETA_ESTADO } from '../../constants';
import { esBloqueada, etiquetaCliente, formatearMonedaEur } from '../../utils/formatearCotizacion';

interface PropsTabInfo {
  cotizacion: Cotizacion;
  form: DatosCotizacionNueva;
  onFormChange: (form: DatosCotizacionNueva) => void;
  onRechazar: (cot: Cotizacion) => void;
}

export default function TabInfoCotizacion({
  cotizacion,
  form,
  onFormChange,
  onRechazar,
}: PropsTabInfo) {
  const bloqueada = esBloqueada(cotizacion.estado);

  const actualizarCampo = <K extends keyof DatosCotizacionNueva>(
    campo: K,
    valor: DatosCotizacionNueva[K],
  ) => {
    onFormChange({ ...form, [campo]: valor });
  };

  return (
    <>
      <div className="drawer-form__ficha">
        <div className="drawer-form__ficha-item">
          <span className="drawer-form__ficha-etiqueta">Cliente / Empresa</span>
          <strong>{etiquetaCliente(cotizacion)}</strong>
        </div>
        <div className="drawer-form__ficha-item">
          <span className="drawer-form__ficha-etiqueta">Destino</span>
          <strong>{cotizacion.destino_nombre ?? 'Sin destino'}</strong>
        </div>
        <div className="drawer-form__ficha-item">
          <span className="drawer-form__ficha-etiqueta">Estado</span>
          <EtiquetaEstado
            etiqueta={ETIQUETA_ESTADO[cotizacion.estado] ?? cotizacion.estado}
            variante={resolverVariante(cotizacion.estado)}
          />
        </div>
        <div className="drawer-form__ficha-item">
          <span className="drawer-form__ficha-etiqueta">Total</span>
          <strong>
            {form.precio_cotizado_eur != null
              ? formatearMonedaEur(form.precio_cotizado_eur)
              : 'Según ítems'}
          </strong>
        </div>
      </div>

      <div className="drawer-form__campo">
        <label className="drawer-form__label">
          Requisitos del cliente <span className="drawer-form__req">*</span>
        </label>
        <textarea
          className="drawer-form__input drawer-form__textarea"
          value={form.requisitos ?? ''}
          onChange={(e) => actualizarCampo('requisitos', e.target.value.slice(0, 1000))}
          maxLength={1000}
          placeholder="Ej: Grupo de 40 de Barquisimeto, salida a Canaima en octubre…"
          rows={3}
          disabled={bloqueada}
        />
      </div>

      <div className="drawer-form__fila-2">
        <div className="drawer-form__campo">
          <label className="drawer-form__label">
            Válida hasta <span className="drawer-form__req">*</span>
          </label>
          <input
            className="drawer-form__input"
            type="date"
            value={form.valida_hasta ? form.valida_hasta.slice(0, 10) : ''}
            onChange={(e) => actualizarCampo('valida_hasta', e.target.value || null)}
            disabled={bloqueada}
          />
        </div>
        <div className="drawer-form__campo">
          <label className="drawer-form__label">Modalidad</label>
          <select
            className="drawer-form__input"
            value={form.modalidad ?? 'individual'}
            onChange={(e) => actualizarCampo('modalidad', e.target.value)}
            disabled={bloqueada}
          >
            <option value="individual">Individual</option>
            <option value="grupo">Grupo</option>
            <option value="propio">Propio</option>
          </select>
        </div>
      </div>

      {!bloqueada && (
        <div className="cot-drawer__acciones-estado">
          <Boton variante="peligro" tamano="sm" onClick={() => onRechazar(cotizacion)}>
            Rechazar
          </Boton>
        </div>
      )}
    </>
  );
}
