import type { CSSProperties } from 'react';
import type { AsientoEnCroquis, CeldaCroquis, CroquisUnidad } from '../../utils/croquis';
import { asientoEnCelda, celdaEspecialEn, resolverLayoutCroquis } from '../../utils/croquis';
import './CroquisUnidad.css';

export type ModoEdicionCroquis = 'asiento' | 'conductor' | 'puerta' | 'vaciar';

interface CroquisUnidadProps {
  asientos: AsientoEnCroquis[];
  croquis?: CroquisUnidad | null;
  idsOcupados?: Set<number>;
  idsSeleccionados?: number[];
  idsBloqueados?: boolean;
  modoEdicion?: ModoEdicionCroquis;
  editable?: boolean;
  onClickAsiento?: (asiento: AsientoEnCroquis & { fila: number; columna: number }) => void;
  onClickCelda?: (fila: number, columna: number, especial?: CeldaCroquis) => void;
}

export default function CroquisUnidad({
  asientos,
  croquis,
  idsOcupados,
  idsSeleccionados = [],
  idsBloqueados = false,
  modoEdicion,
  editable = false,
  onClickAsiento,
  onClickCelda,
}: CroquisUnidadProps) {
  const layout = resolverLayoutCroquis(asientos, croquis, {
    filas: croquis?.filas ?? undefined,
    columnas: croquis?.columnas ?? undefined,
  });

  return (
    <div
      className="croquis"
      style={{ '--croquis-columnas': layout.columnas } as CSSProperties}
    >
      <div className="croquis__techo" aria-hidden="true" />
      <div className="croquis__filas">
        {Array.from({ length: layout.filas }, (_, fila) => (
          <div
            key={fila}
            className={`croquis__fila${fila === 0 ? ' croquis__fila--frente' : ''}${fila === layout.filas - 1 ? ' croquis__fila--fondo' : ''}`}
          >
            {Array.from({ length: layout.columnas }, (_, columna) => {
              const asiento = asientoEnCelda(layout.asientos, fila, columna);
              const especial = celdaEspecialEn(layout.celdas, fila, columna);
              const esPasillo = !asiento && !especial && columna === Math.floor(layout.columnas / 2) && fila !== layout.filas - 1 && fila !== 0;

              if (asiento) {
                const ocupado = asiento.id != null && idsOcupados?.has(asiento.id);
                const seleccionado = asiento.id != null && idsSeleccionados.includes(asiento.id);
                const bloqueado = !ocupado && !seleccionado && idsBloqueados;
                const clases = [
                  'croquis__asiento',
                  ocupado ? 'croquis__asiento--ocupado' : '',
                  seleccionado ? 'croquis__asiento--seleccionado' : '',
                  bloqueado ? 'croquis__asiento--bloqueado' : '',
                  editable ? 'croquis__asiento--editable' : '',
                ].filter(Boolean).join(' ');

                return (
                  <button
                    key={`${fila}-${columna}`}
                    type="button"
                    className={clases}
                    disabled={!editable && (ocupado || bloqueado || !onClickAsiento)}
                    onClick={() => onClickAsiento?.(asiento)}
                    aria-label={`Asiento ${asiento.numero}`}
                    title={asiento.numero}
                  >
                    {ocupado ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    ) : (
                      <span className="croquis__asiento-num">{asiento.numero}</span>
                    )}
                  </button>
                );
              }

              if (especial?.tipo === 'conductor') {
                return (
                  <button
                    key={`${fila}-${columna}`}
                    type="button"
                    className="croquis__especial croquis__especial--conductor"
                    disabled={!editable}
                    onClick={() => onClickCelda?.(fila, columna, especial)}
                  >
                    Conductor
                  </button>
                );
              }

              if (especial?.tipo === 'puerta') {
                return (
                  <button
                    key={`${fila}-${columna}`}
                    type="button"
                    className="croquis__especial croquis__especial--puerta"
                    disabled={!editable}
                    onClick={() => onClickCelda?.(fila, columna, especial)}
                    aria-label="Puerta"
                  />
                );
              }

              return (
                <button
                  key={`${fila}-${columna}`}
                  type="button"
                  className={`croquis__vacio${esPasillo ? ' croquis__vacio--pasillo' : ''}${editable ? ' croquis__vacio--editable' : ''}`}
                  disabled={!editable}
                  onClick={() => onClickCelda?.(fila, columna)}
                  aria-label={editable ? `Celda fila ${fila + 1}, columna ${columna + 1}` : 'Espacio'}
                >
                  {editable && modoEdicion && modoEdicion !== 'vaciar' ? '+' : null}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className="croquis__parabrisas">Frente</div>
    </div>
  );
}
