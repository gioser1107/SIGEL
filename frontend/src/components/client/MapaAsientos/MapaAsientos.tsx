import { useState } from 'react';
import Boton from '../../ui/Boton/Boton';
import type { AsientoViaje } from '../../../types/viaje';
import './MapaAsientos.css';

interface MapaAsientosProps {
  cantidadPuestos: number;
  alConfirmar: (asientosSeleccionados: number[]) => void;
  alRegresar: () => void;
  esAdmin?: boolean;
  /** Asientos reales de la unidad con su estado de disponibilidad */
  asientos?: AsientoViaje[];
}

export default function MapaAsientos({
  cantidadPuestos,
  alConfirmar,
  alRegresar,
  esAdmin = false,
  asientos,
}: MapaAsientosProps) {
  const [asientosSeleccionados, setAsientosSeleccionados] = useState<number[]>([]);
  const [errorConfirmacion, setErrorConfirmacion] = useState<string | null>(null);

  // Usar datos reales si los recibimos, si no fallback estático (para compatibilidad del lado público)
  const usarDatosReales = asientos && asientos.length > 0;
  const totalAsientos = usarDatosReales ? asientos.length : 24;
  const idsOcupados = usarDatosReales
    ? new Set(asientos.filter(a => a.ocupado).map(a => a.id))
    : new Set([3, 4, 8, 15, 16, 21, 22]);

  // Mapeo de index (1-based) a asiento_id real
  const obtenerAsientoId = (indice: number): number => {
    if (usarDatosReales) return asientos[indice - 1].id;
    return indice;
  };

  const obtenerNumeroAsiento = (indice: number): string => {
    if (usarDatosReales) return asientos[indice - 1].numero;
    return String(indice);
  };

  const arregloIndices = Array.from({ length: totalAsientos }, (_, i) => i + 1);

  // Columnas A B | pasillo | C D
  const columnas = ['A', 'B', 'C', 'D'];

  const alternarAsiento = (indice: number) => {
    const asientoId = obtenerAsientoId(indice);
    if (idsOcupados.has(asientoId)) return;
    if (asientosSeleccionados.includes(asientoId)) {
      setAsientosSeleccionados(asientosSeleccionados.filter((s) => s !== asientoId));
    } else {
      if (asientosSeleccionados.length >= cantidadPuestos) return;
      setAsientosSeleccionados([...asientosSeleccionados, asientoId]);
    }
    setErrorConfirmacion(null);
  };

  const manejarConfirmacion = () => {
    if (asientosSeleccionados.length !== cantidadPuestos) {
      setErrorConfirmacion(
        `Debes seleccionar exactamente ${cantidadPuestos} asiento${cantidadPuestos === 1 ? '' : 's'}.`,
      );
      return;
    }
    setErrorConfirmacion(null);
    alConfirmar(asientosSeleccionados);
  };

  const yaAlcanzoLimite = asientosSeleccionados.length >= cantidadPuestos;

  return (
    <div className="mapa-asientos">
      {/* Cabecera */}
      {!esAdmin && (
        <div className="mapa-asientos__header">
          <span className="mapa-asientos__tag">Paso 2</span>
          <h2 className="mapa-asientos__title">Selección de asientos</h2>
          <p className="mapa-asientos__subtitle">
            Selecciona {cantidadPuestos} {cantidadPuestos === 1 ? 'puesto' : 'puestos'} en la unidad de transporte.
          </p>
        </div>
      )}

      {/* Leyenda */}
      <div className="mapa-asientos__legend">
        <div className="mapa-asientos__legend-item">
          <div className="mapa-asientos__seat-sample mapa-asientos__seat-sample--available" />
          <span>Disponible</span>
        </div>
        <div className="mapa-asientos__legend-item">
          <div className="mapa-asientos__seat-sample mapa-asientos__seat-sample--selected" />
          <span>Seleccionado</span>
        </div>
        <div className="mapa-asientos__legend-item">
          <div className="mapa-asientos__seat-sample mapa-asientos__seat-sample--occupied" />
          <span>Ocupado</span>
        </div>
      </div>

      {/* Contenedor del Bus */}
      <div className="mapa-asientos__bus-wrapper">
        {/* Etiquetas de columnas */}
        <div className="mapa-asientos__column-labels">
          {columnas.map((col, i) => (
            <span key={col} className={`mapa-asientos__column-label ${i === 1 ? 'mapa-asientos__column-label--gap' : ''}`}>
              {col}
            </span>
          ))}
        </div>

        <div className="mapa-asientos__bus">
          {/* Cabina del Conductor */}
          <div className="mapa-asientos__driver-cabin">
            <div className="mapa-asientos__windshield">
              <span className="mapa-asientos__windshield-text">PARABRISAS</span>
            </div>
            <div className="mapa-asientos__dashboard-elements">
              <div className="mapa-asientos__wheel" title="Volante">☸️</div>
              <div className="mapa-asientos__driver-seat" title="Chofer">💺 Chofer</div>
            </div>
          </div>

          {/* Grid de Asientos con filas numeradas */}
          <div className="mapa-asientos__seats-area">
            {Array.from({ length: Math.ceil(totalAsientos / 4) }).map((_, filaIdx) => (
              <div key={filaIdx} className="mapa-asientos__row">
                <span className="mapa-asientos__row-number">{filaIdx + 1}</span>
                <div className="mapa-asientos__row-seats">
                  {arregloIndices.slice(filaIdx * 4, filaIdx * 4 + 4).map((indice, colIdx) => {
                    const asientoId = obtenerAsientoId(indice);
                    const numero = obtenerNumeroAsiento(indice);
                    const esOcupado = idsOcupados.has(asientoId);
                    const esSeleccionado = asientosSeleccionados.includes(asientoId);
                    const esBloqueado = !esOcupado && !esSeleccionado && yaAlcanzoLimite;
                    let claseAsiento = 'mapa-asientos__seat';
                    if (esOcupado) claseAsiento += ' mapa-asientos__seat--occupied';
                    if (esSeleccionado) claseAsiento += ' mapa-asientos__seat--selected';
                    if (esBloqueado) claseAsiento += ' mapa-asientos__seat--locked';

                    return (
                      <button
                        key={asientoId}
                        type="button"
                        className={`${claseAsiento} ${colIdx === 1 ? 'mapa-asientos__seat--aisle-right' : ''} ${colIdx === 2 ? 'mapa-asientos__seat--aisle-left' : ''}`}
                        onClick={() => alternarAsiento(indice)}
                        disabled={esOcupado || esBloqueado}
                        aria-label={`Asiento ${numero}`}
                      >
                        {esOcupado ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        ) : (
                          <span className="mapa-asientos__seat-num">{numero}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Resumen inferior — solo asientos seleccionados */}
      <div className="mapa-asientos__ticket-summary">
        <div className="mapa-asientos__ticket-row">
          <span className="mapa-asientos__ticket-label">Asientos seleccionados</span>
          <span className="mapa-asientos__ticket-value">
            {asientosSeleccionados.length > 0
              ? asientosSeleccionados.sort((a, b) => a - b).join(', ')
              : '—'}
          </span>
        </div>
        <div className="mapa-asientos__ticket-row">
          <span className="mapa-asientos__ticket-label">Seleccionados</span>
          <span className="mapa-asientos__ticket-counter">
            {asientosSeleccionados.length} / {cantidadPuestos}
          </span>
        </div>
      </div>

      {/* Acciones */}
      {errorConfirmacion && (
        <p className="fp-card__error fp-card__error--inline" role="alert">
          {errorConfirmacion}
        </p>
      )}
      <div className="mapa-asientos__actions">
        <Boton type="button" variante="fantasma" onClick={alRegresar} className="mapa-asientos__back-btn">
          Atrás
        </Boton>
        <Boton
          type="button"
          variante="primario"
          onClick={manejarConfirmacion}
          disabled={asientosSeleccionados.length !== cantidadPuestos}
          className="mapa-asientos__confirm-btn"
        >
          Confirmar Asientos
        </Boton>
      </div>
    </div>
  );
}
