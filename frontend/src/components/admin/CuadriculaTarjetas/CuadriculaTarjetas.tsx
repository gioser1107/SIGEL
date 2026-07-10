import type { ReactNode } from 'react';
import './CuadriculaTarjetas.css';

interface CuadriculaTarjetasProps<T> {
  datos: T[];
  renderTarjeta: (item: T, indice: number) => ReactNode;
  cargando?: boolean;
  columnas?: 2 | 3 | 4;
  mensajeVacio?: string;
}

function TarjetaEsqueleto() {
  return (
    <div className="cuadricula-tarjetas__esqueleto">
      <div className="cuadricula-tarjetas__esqueleto-cabecera" />
      <div className="cuadricula-tarjetas__esqueleto-linea" style={{ width: '70%' }} />
      <div className="cuadricula-tarjetas__esqueleto-linea" style={{ width: '50%' }} />
      <div className="cuadricula-tarjetas__esqueleto-linea cuadricula-tarjetas__esqueleto-linea--etiqueta" />
    </div>
  );
}

export default function CuadriculaTarjetas<T>({
  datos,
  renderTarjeta,
  cargando = false,
  columnas = 3,
  mensajeVacio = 'No hay registros.',
}: CuadriculaTarjetasProps<T>) {
  if (cargando) {
    return (
      <div className={`cuadricula-tarjetas cuadricula-tarjetas--col-${columnas}`}>
        {Array.from({ length: 6 }).map((_, i) => <TarjetaEsqueleto key={i} />)}
      </div>
    );
  }

  if (datos.length === 0) {
    return (
      <div className="cuadricula-tarjetas__vacio">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
          <polyline points="13 2 13 9 20 9" />
        </svg>
        <p>{mensajeVacio}</p>
      </div>
    );
  }

  return (
    <div className={`cuadricula-tarjetas cuadricula-tarjetas--col-${columnas}`}>
      {datos.map((item, idx) => renderTarjeta(item, idx))}
    </div>
  );
}
