import type { PuntoRecogida } from '../../types/puntoRecogida';
import PuntoRecogidaTarjeta from './PuntoRecogidaTarjeta';
import { referenciaPunto } from './utils';
import './puntos-recogida.css';

interface PuntosRecogidaListProps {
  puntos: PuntoRecogida[];
  soloLectura?: boolean;
  onMarcarPredeterminado?: (id: number) => void;
  onEditar?: (id: number) => void;
  onQuitar?: (id: number) => void;
  accionesDeshabilitadas?: boolean;
}

export default function PuntosRecogidaList({
  puntos,
  soloLectura = false,
  onMarcarPredeterminado,
  onEditar,
  onQuitar,
  accionesDeshabilitadas = false,
}: PuntosRecogidaListProps) {
  if (puntos.length === 0) {
    return (
      <div className="pr-lista-vacio" role="status">
        <div className="pr-lista-vacio__icono" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>
        <p className="pr-lista-vacio__titulo">Sin domicilios registrados</p>
        <p className="pr-lista-vacio__hint">
          Agrega la casa u otro lugar donde la agencia pueda recoger al cliente.
        </p>
      </div>
    );
  }

  return (
    <div className="pr-lista">
      {puntos.map((p) => (
        <PuntoRecogidaTarjeta
          key={p.id}
          nombre={p.nombre}
          direccion={p.direccion}
          ciudad={p.ciudad}
          estado={p.estado}
          referencia={referenciaPunto(p)}
          esPredeterminado={Boolean(p.es_predeterminado)}
          soloLectura={soloLectura}
          accionesDeshabilitadas={accionesDeshabilitadas}
          onMarcarPredeterminado={
            onMarcarPredeterminado ? () => onMarcarPredeterminado(p.id) : undefined
          }
          onEditar={onEditar ? () => onEditar(p.id) : undefined}
          onQuitar={onQuitar ? () => onQuitar(p.id) : undefined}
        />
      ))}
    </div>
  );
}
