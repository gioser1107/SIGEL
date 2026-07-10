import { useEffect, useRef, useState } from 'react';
import './SelectBuscador.css';

export interface OpcionSelectBuscador {
  valor: number;
  etiqueta: string;
  busqueda?: string;
  titulo?: string;
}

interface PropsSelectBuscador {
  opciones: OpcionSelectBuscador[];
  valorSeleccionado: number | null;
  onSeleccionar: (opcion: OpcionSelectBuscador | null) => void;
  placeholder?: string;
  deshabilitado?: boolean;
  cargando?: boolean;
  mensajeVacio?: string;
}

export default function SelectBuscador({
  opciones,
  valorSeleccionado,
  onSeleccionar,
  placeholder = 'Buscar o seleccionar…',
  deshabilitado = false,
  cargando = false,
  mensajeVacio = 'Sin resultados',
}: PropsSelectBuscador) {
  const [busqueda, setBusqueda] = useState('');
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  const opcionActual = opciones.find((o) => o.valor === valorSeleccionado) ?? null;
  const bloqueado = deshabilitado || cargando;

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

  const seleccionar = (op: OpcionSelectBuscador) => {
    onSeleccionar(op);
    setBusqueda('');
    setAbierto(false);
  };

  const limpiar = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSeleccionar(null);
    setBusqueda('');
    setAbierto(false);
  };

  const textoInput = cargando
    ? 'Cargando…'
    : abierto
      ? busqueda
      : (opcionActual?.etiqueta ?? '');

  return (
    <div className={`sb${bloqueado ? ' sb--disabled' : ''}`} ref={contenedorRef}>
      <div
        className="sb__control"
        onClick={() => {
          if (!bloqueado) setAbierto(true);
        }}
      >
        <input
          className="sb__input"
          value={textoInput}
          placeholder={cargando ? 'Cargando…' : placeholder}
          onChange={(e) => {
            if (bloqueado) return;
            setBusqueda(e.target.value);
            setAbierto(true);
          }}
          onFocus={() => {
            if (!bloqueado) setAbierto(true);
          }}
          readOnly={!abierto || bloqueado}
          disabled={bloqueado}
          aria-busy={cargando}
        />
        {opcionActual && !abierto && !bloqueado && (
          <button type="button" className="sb__clear" onClick={limpiar} tabIndex={-1} aria-label="Limpiar">
            ✕
          </button>
        )}
        <span className="sb__chevron" style={{ transform: abierto ? 'rotate(180deg)' : undefined }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </div>

      {abierto && !bloqueado && (
        <div className="sb__menu" role="listbox">
          {opcionesFiltradas.length === 0 ? (
            <div className="sb__empty">
              {busqueda ? `${mensajeVacio} para "${busqueda}"` : mensajeVacio}
            </div>
          ) : (
            opcionesFiltradas.map((op) => (
              <div
                key={op.valor}
                role="option"
                aria-selected={op.valor === valorSeleccionado}
                className={`sb__option${op.valor === valorSeleccionado ? ' sb__option--selected' : ''}`}
                title={op.titulo}
                onMouseDown={(e) => {
                  e.preventDefault();
                  seleccionar(op);
                }}
              >
                {op.etiqueta}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
