import { useEffect, useRef, useState } from 'react';

export interface OpcionSelectMulti {
  id: number;
  etiqueta: string;
  busqueda?: string;
}

interface PropsSelectBuscadorMulti {
  opciones: OpcionSelectMulti[];
  valoresSeleccionados: number[];
  onChange: (ids: number[]) => void;
  placeholder?: string;
  deshabilitado?: boolean;
}

export default function SelectBuscadorMulti({
  opciones,
  valoresSeleccionados,
  onChange,
  placeholder = 'Buscar guía…',
  deshabilitado = false,
}: PropsSelectBuscadorMulti) {
  const [busqueda, setBusqueda] = useState('');
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false);
        setBusqueda('');
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const termino = busqueda.trim().toLowerCase();
  const opcionesFiltradas = termino
    ? opciones.filter((o) => (o.busqueda ?? o.etiqueta).toLowerCase().includes(termino))
    : opciones;

  const alternar = (id: number) => {
    if (valoresSeleccionados.includes(id)) {
      onChange(valoresSeleccionados.filter((v) => v !== id));
      return;
    }
    onChange([...valoresSeleccionados, id]);
  };

  const quitar = (id: number) => {
    onChange(valoresSeleccionados.filter((v) => v !== id));
  };

  const seleccionados = opciones.filter((o) => valoresSeleccionados.includes(o.id));

  return (
    <div className="plan-guias-campo__select-multi">
      {seleccionados.length > 0 && (
        <div className="plan-guias-campo__chips">
          {seleccionados.map((g) => (
            <span key={g.id} className="plan-guias-campo__chip">
              {g.etiqueta}
              {!deshabilitado && (
                <button
                  type="button"
                  className="plan-guias-campo__chip-btn"
                  aria-label={`Quitar ${g.etiqueta}`}
                  onClick={() => quitar(g.id)}
                >
                  ✕
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      <div
        className={`sb${deshabilitado ? ' sb--disabled' : ''}`}
        ref={contenedorRef}
      >
        <div
          className="sb__control"
          onClick={() => {
            if (!deshabilitado) setAbierto(true);
          }}
        >
          <input
            className="sb__input"
            value={busqueda}
            placeholder={placeholder}
            onChange={(e) => {
              if (deshabilitado) return;
              setBusqueda(e.target.value);
              setAbierto(true);
            }}
            onFocus={() => {
              if (!deshabilitado) setAbierto(true);
            }}
            disabled={deshabilitado}
          />
          <span
            className="sb__chevron"
            style={{ transform: abierto ? 'rotate(180deg)' : undefined }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
        </div>

        {abierto && !deshabilitado && (
          <div className="sb__menu">
            {opcionesFiltradas.length === 0 ? (
              <div className="sb__empty">
                {busqueda ? `Sin resultados para "${busqueda}"` : 'No hay guías disponibles'}
              </div>
            ) : (
              opcionesFiltradas.map((op) => {
                const marcado = valoresSeleccionados.includes(op.id);
                return (
                  <div
                    key={op.id}
                    className={`sb__option sb__option--multi${marcado ? ' sb__option--selected' : ''}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      alternar(op.id);
                    }}
                  >
                    <span className="sb__option-check" aria-hidden>
                      {marcado ? '✓' : ''}
                    </span>
                    {op.etiqueta}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
