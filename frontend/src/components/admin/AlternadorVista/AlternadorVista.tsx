import type { ReactElement } from 'react';
import './AlternadorVista.css';

export type VistaModulo = 'tabla' | 'tarjetas';

interface AlternadorVistaProps {
  vista: VistaModulo;
  onChange: (vista: VistaModulo) => void;
}

const OPCIONES: { id: VistaModulo; etiqueta: string; icono: ReactElement }[] = [
  {
    id: 'tabla',
    etiqueta: 'Tabla',
    icono: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="3" y1="15" x2="21" y2="15" />
        <line x1="9" y1="3" x2="9" y2="21" />
      </svg>
    ),
  },
  {
    id: 'tarjetas',
    etiqueta: 'Tarjetas',
    icono: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </svg>
    ),
  },
];

export default function AlternadorVista({ vista, onChange }: AlternadorVistaProps) {
  return (
    <div className="alternador-vista" role="group" aria-label="Cambiar vista">
      {OPCIONES.map((op) => (
        <button
          key={op.id}
          className={`alternador-vista__opcion ${vista === op.id ? 'alternador-vista__opcion--activa' : ''}`}
          onClick={() => onChange(op.id)}
          aria-pressed={vista === op.id}
          title={op.etiqueta}
        >
          {op.icono}
          <span>{op.etiqueta}</span>
        </button>
      ))}
    </div>
  );
}
