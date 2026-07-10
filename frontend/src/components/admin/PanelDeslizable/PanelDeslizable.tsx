import { useEffect, type ReactNode } from 'react';
import './PanelDeslizable.css';

export interface PestaniaPanel {
  id: string;
  etiqueta: string;
}

interface PanelDeslizableProps {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  subtitulo?: string;
  ancho?: 'md' | 'lg' | 'xl';
  pestanias?: PestaniaPanel[];
  pestaniaActiva?: string;
  onPestaniaChange?: (id: string) => void;
  pie?: ReactNode;
  children: ReactNode;
}

export default function PanelDeslizable({
  abierto,
  onCerrar,
  titulo,
  subtitulo,
  ancho = 'lg',
  pestanias,
  pestaniaActiva,
  onPestaniaChange,
  pie,
  children,
}: PanelDeslizableProps) {
  useEffect(() => {
    document.body.style.overflow = abierto ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [abierto]);

  useEffect(() => {
    function alPresionarTecla(e: KeyboardEvent) {
      if (e.key === 'Escape' && abierto) onCerrar();
    }
    document.addEventListener('keydown', alPresionarTecla);
    return () => document.removeEventListener('keydown', alPresionarTecla);
  }, [abierto, onCerrar]);

  return (
    <>
      <div
        className={`panel-deslizable__superposicion ${abierto ? 'panel-deslizable__superposicion--visible' : ''}`}
        onClick={onCerrar}
        aria-hidden="true"
      />
      <aside
        className={`panel-deslizable panel-deslizable--${ancho} ${abierto ? 'panel-deslizable--abierto' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
      >
        <div className="panel-deslizable__cabecera">
          <div className="panel-deslizable__cabecera-info">
            <h2 className="panel-deslizable__titulo">{titulo}</h2>
            {subtitulo && <p className="panel-deslizable__subtitulo">{subtitulo}</p>}
          </div>
          <button
            className="panel-deslizable__cerrar"
            onClick={onCerrar}
            aria-label="Cerrar panel"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {pestanias && pestanias.length > 0 && (
          <div className="panel-deslizable__pestanias" role="tablist">
            {pestanias.map((p) => (
              <button
                key={p.id}
                role="tab"
                aria-selected={pestaniaActiva === p.id}
                className={`panel-deslizable__pestania ${pestaniaActiva === p.id ? 'panel-deslizable__pestania--activa' : ''}`}
                onClick={() => onPestaniaChange?.(p.id)}
              >
                {p.etiqueta}
              </button>
            ))}
          </div>
        )}

        <div className="panel-deslizable__contenido">{children}</div>

        {pie && <div className="panel-deslizable__pie">{pie}</div>}
      </aside>
    </>
  );
}
