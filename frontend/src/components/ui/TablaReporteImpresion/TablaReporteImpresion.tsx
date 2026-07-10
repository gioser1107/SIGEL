import './TablaReporteImpresion.css';

export interface ColumnaReporteImpresion {
  encabezado: string;
  clave: string;
}

interface TablaReporteImpresionProps {
  columnas: ColumnaReporteImpresion[];
  filas: Record<string, string>[];
  mensajeVacio?: string;
}

export default function TablaReporteImpresion({
  columnas,
  filas,
  mensajeVacio = 'No hay registros para mostrar en este reporte.',
}: TablaReporteImpresionProps) {
  if (filas.length === 0) {
    return <p className="reporte-impresion__vacio solo-imprimir">{mensajeVacio}</p>;
  }

  return (
    <table className="reporte-impresion__tabla solo-imprimir">
      <thead>
        <tr>
          {columnas.map((col) => (
            <th key={col.clave} scope="col">
              {col.encabezado}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {filas.map((fila, indice) => (
          <tr key={`fila-${indice}`}>
            {columnas.map((col) => (
              <td key={col.clave}>{fila[col.clave] ?? '—'}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
