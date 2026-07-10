import type { ReactNode } from 'react';
import './CabeceraReporteImpresion.css';

export interface ItemResumenReporte {
  etiqueta: string;
  valor: string | number;
}

interface CabeceraReporteImpresionProps {
  titulo: string;
  subtitulo?: string;
  filtroActivo?: string;
  resumen: ItemResumenReporte[];
  children?: ReactNode;
}

function fechaGeneracion(): string {
  return new Date().toLocaleString('es-VE', {
    dateStyle: 'long',
    timeStyle: 'short',
  });
}

export default function CabeceraReporteImpresion({
  titulo,
  subtitulo,
  filtroActivo,
  resumen,
  children,
}: CabeceraReporteImpresionProps) {
  return (
    <div className="reporte-impresion solo-imprimir">
      <div className="reporte-impresion__marca">
        <span className="reporte-impresion__logo">TravelBqto</span>
        <span className="reporte-impresion__fecha">Generado: {fechaGeneracion()}</span>
      </div>

      <h1 className="reporte-impresion__titulo">{titulo}</h1>
      {subtitulo && <p className="reporte-impresion__subtitulo">{subtitulo}</p>}
      {filtroActivo && (
        <p className="reporte-impresion__subtitulo">Filtro activo: {filtroActivo}</p>
      )}

      <div className="reporte-impresion__resumen">
        {resumen.map((item) => (
          <div key={item.etiqueta} className="reporte-impresion__resumen-item">
            <span className="reporte-impresion__resumen-etiqueta">{item.etiqueta}</span>
            <span className="reporte-impresion__resumen-valor">{item.valor}</span>
          </div>
        ))}
      </div>

      {children}

      <p className="reporte-impresion__pie">
        Documento generado por TravelBqto — Uso interno para toma de decisiones estratégicas.
      </p>
    </div>
  );
}
