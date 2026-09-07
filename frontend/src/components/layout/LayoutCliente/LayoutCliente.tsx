import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import LogoMarca from '../../ui/LogoMarca/LogoMarca';
import useAutenticacion from '../../../hooks/useAutenticacion';
import { nombreCompleto } from '../../../utils/nombrePersona';
import './LayoutCliente.css';

export default function LayoutCliente() {
  const { usuario, cerrarSesion } = useAutenticacion();
  const navegar = useNavigate();

  const manejarCerrarSesion = () => {
    cerrarSesion();
    navegar('/iniciar-sesion');
  };

  return (
    <div className="layout-cliente">
      {/* HEADER — Solo logo y saludo */}
      <header className="cabecera-cliente">
        <div className="cabecera-cliente__contenedor">
          {/* Logo */}
          <Link to="/" className="cabecera-cliente__logo" aria-label="TravelBqto — inicio">
            <LogoMarca compacto />
          </Link>

          {/* User Section */}
          <div className="cabecera-cliente__seccion-usuario">
            <div className="cabecera-cliente__bienvenida">
              <span className="cabecera-cliente__saludo">Hola,</span>
              <span className="cabecera-cliente__nombre-usuario">{usuario ? nombreCompleto(usuario.nombre, usuario.apellido) : 'Pasajero'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="layout-cliente__contenido">
        <div className="layout-cliente__contenedor">
          <Outlet />
        </div>
      </main>

      {/* BOTTOM TAB BAR — Navegación tipo móvil */}
      <nav className="tab-bar" aria-label="Navegación del cliente">
        <NavLink
          to="/client/dashboard"
          end
          className={({ isActive }) => `tab-bar__item ${isActive ? 'tab-bar__item--activo' : ''}`}
        >
          <svg className="tab-bar__icono" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <span className="tab-bar__label">Mis viajes</span>
        </NavLink>

        <NavLink
          to="/client/agenda"
          className={({ isActive }) => `tab-bar__item ${isActive ? 'tab-bar__item--activo' : ''}`}
        >
          <svg className="tab-bar__icono" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span className="tab-bar__label">Agenda</span>
        </NavLink>

        <NavLink
          to="/client/solicitudes"
          className={({ isActive }) => `tab-bar__item ${isActive ? 'tab-bar__item--activo' : ''}`}
        >
          <svg className="tab-bar__icono" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
          </svg>
          <span className="tab-bar__label">Solicitudes</span>
        </NavLink>

        <NavLink
          to="/client/puntos-recogida"
          className={({ isActive }) => `tab-bar__item ${isActive ? 'tab-bar__item--activo' : ''}`}
        >
          <svg className="tab-bar__icono" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 21s7-4.35 7-10a7 7 0 1 0-14 0c0 5.65 7 10 7 10z" />
            <circle cx="12" cy="11" r="2.5" />
          </svg>
          <span className="tab-bar__label">Puntos</span>
        </NavLink>

        <NavLink
          to="/client/resenas"
          className={({ isActive }) => `tab-bar__item ${isActive ? 'tab-bar__item--activo' : ''}`}
        >
          <svg className="tab-bar__icono" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <span className="tab-bar__label">Reseñas</span>
        </NavLink>

        <button
          onClick={manejarCerrarSesion}
          className="tab-bar__item tab-bar__item--cerrar"
        >
          <svg className="tab-bar__icono" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span className="tab-bar__label">Salir</span>
        </button>
      </nav>
    </div>
  );
}
