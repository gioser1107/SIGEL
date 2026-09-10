import { useNavigate } from 'react-router-dom';
import { URL_LOGIN_PARA_RESERVA, useReservas } from '../../../context/Reservas';
import useAutenticacion from '../../../hooks/useAutenticacion';
import type { ViajeAgenda } from '../../../types/viaje';
import { formatearEuro } from '../../../utils/formatoMoneda';
import './ModalDetalleViaje.css';

interface ModalDetalleViajeProps {
  viaje: ViajeAgenda;
  fecha: string;
  fechaFormateada: string;
  onCerrar: () => void;
}

export default function ModalDetalleViaje({ viaje, fecha, fechaFormateada, onCerrar }: ModalDetalleViajeProps) {
  const navegar = useNavigate();
  const { seleccionarViaje } = useReservas();
  const { estaAutenticado } = useAutenticacion();

  const manejarReservar = () => {
    seleccionarViaje(viaje, fecha);
    if (estaAutenticado) {
      navegar('/client/registrar-pago');
    } else {
      navegar(URL_LOGIN_PARA_RESERVA);
    }
  };

  const manejarClickOverlay = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onCerrar();
  };

  // Parsear la descripción en secciones para renderizar bonito
  const lineasDescripcion = viaje.descripcion.split('\n');

  return (
    <div className="modal-detalle" onClick={manejarClickOverlay}>
      <div className="modal-detalle__card">
        {/* Botón cerrar */}
        <button className="modal-detalle__cerrar" onClick={onCerrar} aria-label="Cerrar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Hero con imagen */}
        <div className="modal-detalle__hero" style={{ backgroundImage: `url(${viaje.imagen})` }}>
          <div className="modal-detalle__hero-overlay" />
          <div className="modal-detalle__hero-badges">
            <span className="modal-detalle__dificultad">{viaje.dificultad}</span>
            <span className="modal-detalle__duracion-badge">{viaje.duracion}</span>
          </div>
        </div>

        {/* Contenido */}
        <div className="modal-detalle__body">
          <h2 className="modal-detalle__titulo">{viaje.titulo}</h2>
          <p className="modal-detalle__ubicacion">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {viaje.ubicacion}
          </p>

          {/* Grid de detalles */}
          <div className="modal-detalle__grid">
            <div className="modal-detalle__dato">
              <span className="modal-detalle__dato-label">Fecha</span>
              <span className="modal-detalle__dato-value">{fechaFormateada}</span>
            </div>
            <div className="modal-detalle__dato">
              <span className="modal-detalle__dato-label">Hora de salida</span>
              <span className="modal-detalle__dato-value">{viaje.hora}</span>
            </div>
            <div className="modal-detalle__dato">
              <span className="modal-detalle__dato-label">Duración</span>
              <span className="modal-detalle__dato-value">{viaje.duracion}</span>
            </div>
            <div className="modal-detalle__dato">
              <span className="modal-detalle__dato-label">Cupos disponibles</span>
              <span className="modal-detalle__dato-value">{viaje.cupos}</span>
            </div>
          </div>

          {/* Descripción completa del viaje */}
          <div className="modal-detalle__descripcion">
            {lineasDescripcion.map((linea, idx) => {
              if (linea.trim() === '') return <br key={idx} />;
              return <p key={idx} className="modal-detalle__descripcion-linea">{linea}</p>;
            })}
          </div>

          {/* Línea de corte con muescas */}
          <div className="modal-detalle__tear">
            <span className="modal-detalle__notch modal-detalle__notch--left"></span>
            <span className="modal-detalle__tear-line"></span>
            <span className="modal-detalle__notch modal-detalle__notch--right"></span>
          </div>

          {/* Precio + Reservar */}
          <div className="modal-detalle__footer">
            <div className="modal-detalle__precio">
              <span className="modal-detalle__precio-monto">{formatearEuro(viaje.precio)}</span>
              <span className="modal-detalle__precio-sufijo">/persona</span>
            </div>
            <button className="modal-detalle__btn-reservar" onClick={manejarReservar}>
              Reservar este viaje
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
