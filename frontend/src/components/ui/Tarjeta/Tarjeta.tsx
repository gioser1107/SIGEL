import type { ReactNode } from 'react';
import './Tarjeta.css';

interface TarjetaProps {
  imagen?: string;
  titulo: string;
  ubicacion?: string;
  descripcion?: string;
  precio?: string;
  etiquetaPrecio?: string;
  valoracion?: number;
  etiqueta?: string;
  onClick?: () => void;
  children?: ReactNode;
}

/**
 * Tarjeta — Tarjeta reutilizable para destinos de viaje.
 * Muestra imagen, título, ubicación, precio y rating.
 */
export default function Tarjeta({
  imagen,
  titulo,
  ubicacion,
  descripcion,
  precio,
  etiquetaPrecio = 'por persona',
  valoracion,
  etiqueta,
  onClick,
  children,
}: TarjetaProps) {
  return (
    <article className="tarjeta" onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}>
      {/* Imagen */}
      {imagen && (
        <div className="tarjeta__contenedor-imagen">
          <img src={imagen} alt={titulo} className="tarjeta__imagen" loading="lazy" />
          {etiqueta && <span className="tarjeta__etiqueta">{etiqueta}</span>}
          <button className="tarjeta__favorito" aria-label="Agregar a favoritos">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.6-7 10-7 10z" />
            </svg>
          </button>
        </div>
      )}

      {/* Contenido */}
      <div className="tarjeta__contenido">
        <h3 className="tarjeta__titulo">{titulo}</h3>

        {ubicacion && (
          <div className="tarjeta__ubicacion">
            {ubicacion}
          </div>
        )}

        {descripcion && (
          <p className="tarjeta__descripcion">{descripcion}</p>
        )}

        {children}

        {(precio || valoracion) && (
          <div className="tarjeta__pie">
            {precio && (
              <div className="tarjeta__precio">
                {precio}
                <span className="tarjeta__etiqueta-precio"> {etiquetaPrecio}</span>
              </div>
            )}
            {valoracion && (
              <div className="tarjeta__valoracion">
                {valoracion.toFixed(1)}
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
