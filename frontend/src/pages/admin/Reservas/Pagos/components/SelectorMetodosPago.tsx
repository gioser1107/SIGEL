import type { MetodoPago } from '../../../../../types/pagos';
import { etiquetaMetodoCorta } from '../utils/metodosPagoUi';

interface SelectorMetodosPagoProps {
  metodos: MetodoPago[];
  metodoSeleccionadoId: string;
  onSeleccionar: (metodo: MetodoPago) => void;
  deshabilitado?: boolean;
}

function IconoMetodo({ codigo }: { codigo: string }) {
  switch (codigo) {
    case 'pago_movil':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <rect x="7" y="2" width="10" height="20" rx="2" />
          <line x1="12" y1="18" x2="12" y2="18.01" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
    case 'transferencia':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M7 10h10M7 10l3-3M7 10l3 3" />
          <path d="M17 14H7M17 14l-3-3M17 14l-3 3" />
        </svg>
      );
    case 'tpv':
    case 'punto':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
        </svg>
      );
    case 'zelle':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      );
    default:
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
          <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
          <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
        </svg>
      );
  }
}

export default function SelectorMetodosPago({
  metodos,
  metodoSeleccionadoId,
  onSeleccionar,
  deshabilitado = false,
}: SelectorMetodosPagoProps) {
  return (
    <div className="pagos-metodos">
      <p className="pagos-metodos__titulo">Métodos de pago disponibles</p>
      <div className="pagos-metodos__grid" role="listbox" aria-label="Métodos de pago">
        {metodos.map((m) => {
          const activo = String(m.id) === metodoSeleccionadoId;
          return (
            <button
              key={m.id}
              type="button"
              role="option"
              aria-selected={activo}
              disabled={deshabilitado}
              className={`pagos-metodo-card${activo ? ' pagos-metodo-card--activo' : ''}`}
              onClick={() => onSeleccionar(m)}
            >
              {activo && (
                <span className="pagos-metodo-card__check" aria-hidden>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
              )}
              <span className="pagos-metodo-card__icon">
                <IconoMetodo codigo={m.codigo} />
              </span>
              <span className="pagos-metodo-card__nombre">{etiquetaMetodoCorta(m)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
