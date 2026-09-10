import type { MetodoPago } from '../../../../../types/pagos';
import Boton from '../../../../../components/ui/Boton/Boton';
import { etiquetaMetodoCorta } from '../../../Reservas/Pagos/utils/metodosPagoUi';
import type { FiltrosBandeja } from '../constants';
import { extraerIdReserva } from '../constants';
import { fechaHoyIso } from '../../../../../utils/validacionesFormulario';

interface FiltrosBandejaPagosProps {
  filtros: FiltrosBandeja;
  metodos: MetodoPago[];
  onChange: (filtros: FiltrosBandeja) => void;
  onAplicar: () => void;
  onLimpiar: () => void;
}

export default function FiltrosBandejaPagos({
  filtros,
  metodos,
  onChange,
  onAplicar,
  onLimpiar,
}: FiltrosBandejaPagosProps) {
  const hayFiltrosExtra = Boolean(
    filtros.reserva_id || filtros.metodo_pago_id || filtros.fecha_desde || filtros.fecha_hasta,
  );

  return (
    <form
      className="pagos-admin__panel-filtros"
      onSubmit={(e) => {
        e.preventDefault();
        onAplicar();
      }}
    >
      <p className="pagos-admin__panel-filtros-titulo">Acotar la lista</p>
      <div className="pagos-admin__filtros">
        <label className="pagos-admin__filtro-campo">
          <span>Reserva</span>
          <input
            type="text"
            inputMode="numeric"
            className="drawer-form__input"
            value={filtros.reserva_id}
            onChange={(e) => onChange({ ...filtros, reserva_id: extraerIdReserva(e.target.value) })}
            placeholder="Ej. 12"
            aria-label="Número de reserva"
          />
        </label>
        <label className="pagos-admin__filtro-campo">
          <span>Método</span>
          <select
            className="drawer-form__input"
            value={filtros.metodo_pago_id}
            onChange={(e) => onChange({ ...filtros, metodo_pago_id: e.target.value })}
          >
            <option value="">Todos los métodos</option>
            {metodos.map((m) => (
              <option key={m.id} value={m.id}>{etiquetaMetodoCorta(m)}</option>
            ))}
          </select>
        </label>
        <label className="pagos-admin__filtro-campo">
          <span>Desde</span>
          <input
            type="date"
            max={fechaHoyIso()}
            className="drawer-form__input"
            value={filtros.fecha_desde}
            onChange={(e) => onChange({ ...filtros, fecha_desde: e.target.value })}
          />
        </label>
        <label className="pagos-admin__filtro-campo">
          <span>Hasta</span>
          <input
            type="date"
            max={fechaHoyIso()}
            className="drawer-form__input"
            value={filtros.fecha_hasta}
            onChange={(e) => onChange({ ...filtros, fecha_hasta: e.target.value })}
          />
        </label>
        <div className="pagos-admin__filtros-acciones">
          <Boton type="submit" variante="secundario" tamano="sm">
            Buscar
          </Boton>
          {hayFiltrosExtra && (
            <Boton type="button" variante="fantasma" tamano="sm" onClick={onLimpiar}>
              Quitar filtros
            </Boton>
          )}
        </div>
      </div>
    </form>
  );
}
