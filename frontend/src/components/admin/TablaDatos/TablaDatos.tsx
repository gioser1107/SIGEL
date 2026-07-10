import type { PropsTablaDatos } from './tipos';
import './TablaDatos.css';

function FilasSkeleton({ columnas, filas = 5 }: { columnas: number; filas?: number }) {
  return (
    <>
      {Array.from({ length: filas }).map((_, i) => (
        <tr key={i} className="tabla-datos__fila tabla-datos__fila--skeleton">
          {Array.from({ length: columnas }).map((__, j) => (
            <td key={j} className="tabla-datos__celda">
              <div className="tabla-datos__esqueleto" style={{ width: j === 0 ? '60%' : '80%' }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export default function TablaDatos<T>({
  columnas,
  datos,
  cargando = false,
  mensajeVacio = 'No hay registros.',
  accionesVacio,
  seleccionMultiple = false,
  filasSeleccionadas,
  onSeleccionChange,
  ordenActual,
  onOrdenar,
  accionesFila,
  onFilaClick,
  idFila,
}: PropsTablaDatos<T>) {
  const totalColumnas = columnas.length + (seleccionMultiple ? 1 : 0) + (accionesFila ? 1 : 0);

  function alternarFila(id: string | number) {
    if (!onSeleccionChange || !filasSeleccionadas) return;
    const nuevo = new Set(filasSeleccionadas);
    if (nuevo.has(id)) nuevo.delete(id);
    else nuevo.add(id);
    onSeleccionChange(nuevo);
  }

  function alternarTodos() {
    if (!onSeleccionChange || !filasSeleccionadas || !idFila) return;
    if (filasSeleccionadas.size === datos.length) {
      onSeleccionChange(new Set());
    } else {
      onSeleccionChange(new Set(datos.map(idFila)));
    }
  }

  function manejarOrden(columnaId: string) {
    if (!onOrdenar) return;
    if (ordenActual?.columna === columnaId) {
      onOrdenar(columnaId, ordenActual.direccion === 'asc' ? 'desc' : 'asc');
    } else {
      onOrdenar(columnaId, 'asc');
    }
  }

  const todosSeleccionados =
    seleccionMultiple && filasSeleccionadas && idFila
      ? filasSeleccionadas.size === datos.length && datos.length > 0
      : false;

  return (
    <div className="tabla-datos__contenedor">
      <table className="tabla-datos">
        <thead className="tabla-datos__cabecera">
          <tr>
            {seleccionMultiple && (
              <th className="tabla-datos__th tabla-datos__th--casilla">
                <input
                  type="checkbox"
                  checked={todosSeleccionados}
                  onChange={alternarTodos}
                  aria-label="Seleccionar todos"
                  className="tabla-datos__casilla"
                />
              </th>
            )}
            {columnas.map((col) => (
              <th
                key={col.id}
                className={`tabla-datos__th ${col.ordenable ? 'tabla-datos__th--ordenable' : ''}`}
                style={{ width: col.ancho, textAlign: col.alineacion ?? 'left' }}
                onClick={col.ordenable ? () => manejarOrden(col.id) : undefined}
              >
                <span className="tabla-datos__th-contenido">
                  {col.encabezado}
                  {col.ordenable && (
                    <span className="tabla-datos__iconos-orden" aria-hidden="true">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path
                          d="M5 2L8 5H2L5 2Z"
                          fill={ordenActual?.columna === col.id && ordenActual.direccion === 'asc' ? 'currentColor' : '#cbd5e1'}
                        />
                        <path
                          d="M5 8L2 5H8L5 8Z"
                          fill={ordenActual?.columna === col.id && ordenActual.direccion === 'desc' ? 'currentColor' : '#cbd5e1'}
                        />
                      </svg>
                    </span>
                  )}
                </span>
              </th>
            ))}
            {accionesFila && (
              <th className="tabla-datos__th tabla-datos__th--acciones">Acciones</th>
            )}
          </tr>
        </thead>
        <tbody>
          {cargando && <FilasSkeleton columnas={totalColumnas} />}

          {!cargando && datos.length === 0 && (
            <tr>
              <td colSpan={totalColumnas} className="tabla-datos__vacio">
                <div className="tabla-datos__vacio-contenido">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                    <polyline points="13 2 13 9 20 9" />
                  </svg>
                  <p>{mensajeVacio}</p>
                  {accionesVacio}
                </div>
              </td>
            </tr>
          )}

          {!cargando && datos.map((fila, idx) => {
            const id = idFila ? idFila(fila) : idx;
            const seleccionada = filasSeleccionadas?.has(id) ?? false;
            return (
              <tr
                key={id}
                className={`tabla-datos__fila ${seleccionada ? 'tabla-datos__fila--seleccionada' : ''} ${onFilaClick ? 'tabla-datos__fila--clickeable' : ''}`}
                onClick={onFilaClick ? () => onFilaClick(fila) : undefined}
              >
                {seleccionMultiple && (
                  <td className="tabla-datos__celda tabla-datos__celda--casilla">
                    <input
                      type="checkbox"
                      checked={seleccionada}
                      onChange={() => alternarFila(id)}
                      aria-label="Seleccionar fila"
                      className="tabla-datos__casilla"
                    />
                  </td>
                )}
                {columnas.map((col) => (
                  <td
                    key={col.id}
                    className="tabla-datos__celda"
                    style={{ textAlign: col.alineacion ?? 'left' }}
                  >
                    {col.accessor(fila)}
                  </td>
                ))}
                {accionesFila && (
                  <td
                    className="tabla-datos__celda tabla-datos__celda--acciones"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="tabla-datos__grupo-acciones">
                      {accionesFila(fila)}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
