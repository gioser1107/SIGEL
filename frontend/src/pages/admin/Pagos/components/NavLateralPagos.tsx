import type { SeccionPagos } from '../types';
import { GRUPOS_PAGOS } from '../constants';
import '../ModuloPagos.css';

interface NavLateralPagosProps {
  seccion: SeccionPagos;
  onChange: (id: SeccionPagos) => void;
}

function IconoSeccion({ id }: { id: SeccionPagos }) {
  const props = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  switch (id) {
    case 'bandeja':
      return (
        <svg {...props}>
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
        </svg>
      );
    case 'tasas':
      return (
        <svg {...props}>
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        </svg>
      );
    case 'monedas':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="8" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
      );
    case 'metodos':
      return (
        <svg {...props}>
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
          <line x1="6" y1="15" x2="10" y2="15" />
        </svg>
      );
    case 'bancos':
      return (
        <svg {...props}>
          <path d="M3 21h18" />
          <path d="M3 10h18" />
          <path d="M5 10l7-7 7 7" />
          <path d="M7 10v8" />
          <path d="M12 10v8" />
          <path d="M17 10v8" />
        </svg>
      );
    case 'puntos_venta':
      return (
        <svg {...props}>
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
  }
}

export default function NavLateralPagos({ seccion, onChange }: NavLateralPagosProps) {
  const opciones = GRUPOS_PAGOS.flatMap((g) =>
    g.secciones.map((s) => ({ id: s.id, etiqueta: s.etiqueta, grupo: g.etiqueta }))
  );

  return (
    <>
      <nav className="pagos-admin__nav" aria-label="Secciones de pagos">
        <p className="pagos-admin__nav-titulo">Secciones</p>

        {GRUPOS_PAGOS.map((grupo, index) => (
          <div
            key={grupo.etiqueta}
            className={`pagos-admin__nav-grupo${index > 0 ? ' pagos-admin__nav-grupo--separado' : ''}`}
          >
            <p className="pagos-admin__nav-grupo-titulo">{grupo.etiqueta}</p>
            <ul className="pagos-admin__nav-lista">
              {grupo.secciones.map((s) => {
                const activo = seccion === s.id;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      className={`pagos-admin__nav-item${activo ? ' pagos-admin__nav-item--activo' : ''}`}
                      onClick={() => onChange(s.id)}
                      aria-current={activo ? 'page' : undefined}
                    >
                      <span className="pagos-admin__nav-item-icono">
                        <IconoSeccion id={s.id} />
                      </span>
                      <span className="pagos-admin__nav-item-texto">{s.etiqueta}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <label className="pagos-admin__nav-movil">
        <span className="pagos-admin__nav-movil-etq">Sección</span>
        <select
          className="pagos-admin__nav-movil-select drawer-form__input"
          value={seccion}
          onChange={(e) => onChange(e.target.value as SeccionPagos)}
          aria-label="Sección del módulo de pagos"
        >
          {opciones.map((o) => (
            <option key={o.id} value={o.id}>
              {o.grupo} · {o.etiqueta}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
