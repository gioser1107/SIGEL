import type { MetodoPago } from '../../../../../types/pagos';
import Boton from '../../../../../components/ui/Boton/Boton';
import { ETIQUETA_ESTADO_PAGO } from '../../constants';
import { etiquetaMetodoCorta } from '../../../Reservas/Pagos/utils/metodosPagoUi';
import type { FiltrosBandeja } from '../constants';
import { FILTROS_BANDEJA_VACIOS } from '../constants';

interface FiltrosBandejaPagosProps {
  filtros: FiltrosBandeja;
  metodos: MetodoPago[];
  onChange: (filtros: FiltrosBandeja) => void;
  onAplicar: () => void;
  onRestablecer: () => void;
}

export default function FiltrosBandejaPagos({
  filtros,
  metodos,
  onChange,
  onAplicar,
  onRestablecer,
}: FiltrosBandejaPagosProps) {
  return (
    <div className="pagos-admin__panel-filtros">
      <p className="pagos-admin__panel-filtros-titulo">Buscar pagos</p>
      <div className="pagos-admin__filtros">
        <select
          className="drawer-form__input"
          value={filtros.estado}
          onChange={(e) => onChange({ ...filtros, estado: e.target.value })}
          aria-label="Estado"
        >
          <option value="">Todos los estados</option>
          {Object.entries(ETIQUETA_ESTADO_PAGO).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <input
          className="drawer-form__input"
          type="number"
          placeholder="ID reserva"
          value={filtros.reserva_id}
          onChange={(e) => onChange({ ...filtros, reserva_id: e.target.value })}
        />
        <select
          className="drawer-form__input"
          value={filtros.metodo_pago_id}
          onChange={(e) => onChange({ ...filtros, metodo_pago_id: e.target.value })}
          aria-label="Método de pago"
        >
          <option value="">Todos los métodos</option>
          {metodos.map((m) => (
            <option key={m.id} value={m.id}>{etiquetaMetodoCorta(m)}</option>
          ))}
        </select>
        <input
          type="date"
          className="drawer-form__input"
          value={filtros.fecha_desde}
          onChange={(e) => onChange({ ...filtros, fecha_desde: e.target.value })}
          aria-label="Desde"
        />
        <input
          type="date"
          className="drawer-form__input"
          value={filtros.fecha_hasta}
          onChange={(e) => onChange({ ...filtros, fecha_hasta: e.target.value })}
          aria-label="Hasta"
        />
        <div className="pagos-admin__filtros-acciones">
          <Boton variante="secundario" tamano="sm" onClick={onAplicar}>
            Aplicar filtros
          </Boton>
          <Boton
            variante="fantasma"
            tamano="sm"
            onClick={() => {
              onChange(FILTROS_BANDEJA_VACIOS);
              onRestablecer();
            }}
          >
            Solo pendientes
          </Boton>
        </div>
      </div>
    </div>
  );
}
