import { Link } from 'react-router-dom';
import type { NotificacionesAdmin } from '../../../hooks/useNotificaciones';

interface PanelNotificacionesProps {
  datos: NotificacionesAdmin;
  onCerrar: () => void;
  puedeVerCotizaciones: boolean;
  puedeVerReservas: boolean;
}

export default function PanelNotificaciones({
  datos,
  onCerrar,
  puedeVerCotizaciones,
  puedeVerReservas,
}: PanelNotificacionesProps) {
  const { total, cotizacionesPendientes, reservasPendientes, cargando } = datos;

  return (
    <div className="admin-notificaciones__panel" role="dialog" aria-label="Panel de notificaciones">
      <div className="admin-notificaciones__cabecera">
        <h3 className="admin-notificaciones__titulo">Notificaciones</h3>
      </div>

      <div className="admin-notificaciones__cuerpo">
        {cargando ? (
          <p className="admin-notificaciones__vacio">Cargando…</p>
        ) : total === 0 ? (
          <p className="admin-notificaciones__vacio">Todo al día</p>
        ) : (
          <ul className="admin-notificaciones__lista">
            {puedeVerCotizaciones && cotizacionesPendientes > 0 && (
              <li>
                <Link
                  to="/admin/cotizaciones"
                  className="admin-notificaciones__item"
                  onClick={onCerrar}
                >
                  <span className="admin-notificaciones__item-icono" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </span>
                  <span className="admin-notificaciones__item-texto">
                    {cotizacionesPendientes === 1
                      ? '1 cotización pendiente'
                      : `${cotizacionesPendientes} cotizaciones pendientes`}
                  </span>
                  <span className="admin-notificaciones__item-badge">{cotizacionesPendientes}</span>
                </Link>
              </li>
            )}
            {puedeVerReservas && reservasPendientes > 0 && (
              <li>
                <Link
                  to="/admin/reservas"
                  className="admin-notificaciones__item"
                  onClick={onCerrar}
                >
                  <span className="admin-notificaciones__item-icono" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </span>
                  <span className="admin-notificaciones__item-texto">
                    {reservasPendientes === 1
                      ? '1 reserva sin confirmar'
                      : `${reservasPendientes} reservas sin confirmar`}
                  </span>
                  <span className="admin-notificaciones__item-badge">{reservasPendientes}</span>
                </Link>
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
