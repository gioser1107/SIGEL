import { ACCIONES, MODULOS } from '../constants';
import { fechaHoyIso } from '../../../../utils/validacionesFormulario';

interface PropsBarraFiltros {
  busqueda: string;
  filtroModulo: string;
  filtroAccion: string;
  fechaDesde: string;
  fechaHasta: string;
  onBusquedaChange: (valor: string) => void;
  onModuloChange: (valor: string) => void;
  onAccionChange: (valor: string) => void;
  onFechaDesdeChange: (valor: string) => void;
  onFechaHastaChange: (valor: string) => void;
}

// Renderiza la barra de filtros: búsqueda, módulo, acción y rango de fechas
export default function BarraFiltrosBitacora({
  busqueda,
  filtroModulo,
  filtroAccion,
  fechaDesde,
  fechaHasta,
  onBusquedaChange,
  onModuloChange,
  onAccionChange,
  onFechaDesdeChange,
  onFechaHastaChange,
}: PropsBarraFiltros) {
  return (
    <div className="bitacora__toolbar">
      <div className="bitacora__toolbar-izq">
        <label className="bitacora__busqueda">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            placeholder="Buscar en resumen o usuario..."
            value={busqueda}
            onChange={(e) => onBusquedaChange(e.target.value)}
          />
        </label>

        <select
          className="bitacora__filtro"
          value={filtroModulo}
          onChange={(e) => onModuloChange(e.target.value)}
        >
          {MODULOS.map((m) => (
            <option key={m.valor || 'todos'} value={m.valor}>
              {m.etiqueta}
            </option>
          ))}
        </select>

        <select
          className="bitacora__filtro"
          value={filtroAccion}
          onChange={(e) => onAccionChange(e.target.value)}
        >
          {ACCIONES.map((a) => (
            <option key={a.valor || 'todas'} value={a.valor}>
              {a.etiqueta}
            </option>
          ))}
        </select>

        <input
          type="date"
          max={fechaHoyIso()}
          className="bitacora__filtro bitacora__filtro--fecha"
          value={fechaDesde}
          onChange={(e) => onFechaDesdeChange(e.target.value)}
          title="Fecha desde"
        />
        <input
          type="date"
          max={fechaHoyIso()}
          className="bitacora__filtro bitacora__filtro--fecha"
          value={fechaHasta}
          onChange={(e) => onFechaHastaChange(e.target.value)}
          title="Fecha hasta"
        />
      </div>
    </div>
  );
}
