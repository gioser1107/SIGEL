import type { MouseEvent } from 'react';
import './BotonAccionTabla.css';

export type AccionTabla =
  | 'ver'
  | 'editar'
  | 'eliminar'
  | 'anular'
  | 'desactivar'
  | 'aprobar'
  | 'rechazar'
  | 'asientos'
  | 'mostrar'
  | 'ocultar'
  | 'predeterminado';

const ETIQUETAS: Record<AccionTabla, string> = {
  ver: 'Ver',
  editar: 'Editar',
  eliminar: 'Eliminar',
  anular: 'Anular',
  desactivar: 'Desactivar',
  aprobar: 'Aprobar',
  rechazar: 'Rechazar',
  asientos: 'Gestionar asientos',
  mostrar: 'Mostrar',
  ocultar: 'Ocultar',
  predeterminado: 'Marcar predeterminado',
};

type VarianteAccion = 'neutro' | 'primario' | 'exito' | 'peligro';

const VARIANTES: Record<AccionTabla, VarianteAccion> = {
  ver: 'neutro',
  editar: 'neutro',
  eliminar: 'peligro',
  anular: 'peligro',
  desactivar: 'peligro',
  aprobar: 'exito',
  rechazar: 'peligro',
  asientos: 'primario',
  mostrar: 'neutro',
  ocultar: 'neutro',
  predeterminado: 'primario',
};

interface PropsBotonAccionTabla {
  accion: AccionTabla;
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  titulo?: string;
  ariaLabel?: string;
  className?: string;
}

function IconoAccion({ accion }: { accion: AccionTabla }) {
  const props = {
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  switch (accion) {
    case 'ver':
      return (
        <svg {...props}>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case 'editar':
      return (
        <svg {...props}>
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      );
    case 'eliminar':
    case 'anular':
      return (
        <svg {...props}>
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
        </svg>
      );
    case 'desactivar':
      return (
        <svg {...props}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <line x1="17" y1="8" x2="23" y2="14" />
          <line x1="23" y1="8" x2="17" y2="14" />
        </svg>
      );
    case 'aprobar':
      return (
        <svg {...props}>
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      );
    case 'rechazar':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      );
    case 'asientos':
      return (
        <svg {...props}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );
    case 'mostrar':
      return (
        <svg {...props}>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case 'ocultar':
      return (
        <svg {...props}>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      );
    case 'predeterminado':
      return (
        <svg {...props}>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );
  }
}

export default function BotonAccionTabla({
  accion,
  onClick,
  disabled = false,
  titulo,
  ariaLabel,
  className,
}: PropsBotonAccionTabla) {
  const etiqueta = titulo ?? ETIQUETAS[accion];
  const variante = VARIANTES[accion];
  const clases = ['boton-accion-tabla', `boton-accion-tabla--${variante}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={clases}
      onClick={onClick}
      disabled={disabled}
      title={etiqueta}
      aria-label={ariaLabel ?? etiqueta}
    >
      <IconoAccion accion={accion} />
    </button>
  );
}
