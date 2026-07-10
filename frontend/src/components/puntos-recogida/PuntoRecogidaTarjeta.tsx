import { BotonAccionTabla } from '../admin';
import './puntos-recogida.css';

interface PropsPuntoRecogidaTarjeta {
  nombre: string;
  direccion?: string | null;
  ciudad?: string | null;
  estado?: string | null;
  referencia?: string | null;
  esPredeterminado?: boolean;
  soloLectura?: boolean;
  accionesDeshabilitadas?: boolean;
  onMarcarPredeterminado?: () => void;
  onEditar?: () => void;
  onQuitar?: () => void;
}

function IconoUbicacion() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

export default function PuntoRecogidaTarjeta({
  nombre,
  direccion,
  ciudad,
  estado,
  referencia,
  esPredeterminado = false,
  soloLectura = false,
  accionesDeshabilitadas = false,
  onMarcarPredeterminado,
  onEditar,
  onQuitar,
}: PropsPuntoRecogidaTarjeta) {
  const ubicacion = [ciudad, estado].filter(Boolean).join(', ');
  const hayAcciones = !soloLectura && (onMarcarPredeterminado || onEditar || onQuitar);

  return (
    <article
      className={`pr-tarjeta${esPredeterminado ? ' pr-tarjeta--predeterminado' : ''}`}
    >
      <div className="pr-tarjeta__icono" aria-hidden="true">
        <IconoUbicacion />
      </div>

      <div className="pr-tarjeta__cuerpo">
        <div className="pr-tarjeta__cabecera">
          <h4 className="pr-tarjeta__nombre">{nombre}</h4>
          {esPredeterminado && (
            <span className="pr-tarjeta__badge">Predeterminado</span>
          )}
        </div>

        {ubicacion && <p className="pr-tarjeta__meta">{ubicacion}</p>}

        {direccion && <p className="pr-tarjeta__direccion">{direccion}</p>}

        {referencia && (
          <p className="pr-tarjeta__referencia">
            <span className="pr-tarjeta__referencia-etq">Referencia:</span> {referencia}
          </p>
        )}
      </div>

      {hayAcciones && (
        <div className="pr-tarjeta__acciones">
          {!esPredeterminado && onMarcarPredeterminado && (
            <BotonAccionTabla
              accion="predeterminado"
              disabled={accionesDeshabilitadas}
              onClick={() => onMarcarPredeterminado()}
            />
          )}
          {onEditar && (
            <BotonAccionTabla
              accion="editar"
              disabled={accionesDeshabilitadas}
              onClick={() => onEditar()}
            />
          )}
          {onQuitar && (
            <BotonAccionTabla
              accion="eliminar"
              disabled={accionesDeshabilitadas}
              onClick={() => onQuitar()}
            />
          )}
        </div>
      )}
    </article>
  );
}
