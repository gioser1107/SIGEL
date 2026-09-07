import { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import LogoMarca from '../../ui/LogoMarca/LogoMarca';
import useAutenticacion from '../../../hooks/useAutenticacion';
import './LayoutPublico.css';

/**
 * LayoutPublico — Envuelve todas las páginas públicas.
 * Incluye:
 *  - Navbar flotante/transparente con glassmorphism al hacer scroll
 *  - Footer con enlaces y redes sociales
 *  - <Outlet /> para renderizar las páginas hijas
 */
export default function LayoutPublico() {
  const [estaScrolleado, setEstaScrolleado] = useState(false);
  const [estaMenuMovilAbierto, setEstaMenuMovilAbierto] = useState(false);
  const scrollAntesMenuRef = useRef(0);
  const ubicacion = useLocation();
  const { estaAutenticado, esAdmin } = useAutenticacion();

  // Detectar scroll para cambiar el estilo del navbar
  useEffect(() => {
    const manejarScroll = () => {
      if (estaMenuMovilAbierto) {
        return;
      }
      setEstaScrolleado(window.scrollY > 40);
    };

    window.addEventListener('scroll', manejarScroll, { passive: true });
    manejarScroll();
    return () => window.removeEventListener('scroll', manejarScroll);
  }, [estaMenuMovilAbierto]);

  const enlacesNavegacion = [
    { to: '/', label: 'Inicio' },
    { to: '/#destinos', label: 'Destinos' },
    { to: '/agenda', label: 'Agenda' },
    { to: '/#nosotros', label: 'Nosotros' },
    { to: '/#contacto', label: 'Contacto' },
  ];

  const esPaginaPrincipal = ubicacion.pathname === '/';
  const aplicarFondo = estaScrolleado || !esPaginaPrincipal || estaMenuMovilAbierto;

  useEffect(() => {
    setEstaMenuMovilAbierto(false);
  }, [ubicacion.pathname]);

  /* Evita que la página se desplace detrás del menú móvil abierto */
  useEffect(() => {
    if (!estaMenuMovilAbierto) {
      return;
    }

    const scrollY = window.scrollY;
    scrollAntesMenuRef.current = scrollY;
    document.documentElement.classList.add('layout-publico--menu-abierto');
    document.body.classList.add('layout-publico--menu-abierto');
    document.body.style.top = `-${scrollY}px`;

    return () => {
      const scrollRestaurado = scrollAntesMenuRef.current;
      document.documentElement.classList.remove('layout-publico--menu-abierto');
      document.body.classList.remove('layout-publico--menu-abierto');
      document.body.style.top = '';
      window.scrollTo(0, scrollRestaurado);
      setEstaScrolleado(scrollRestaurado > 40);
    };
  }, [estaMenuMovilAbierto]);

  return (
    <div className={`layout-publico ${estaMenuMovilAbierto ? 'layout-publico--menu-abierto' : ''}`}>
      {/* NAVBAR */}
      <nav
        className={`navbar ${aplicarFondo ? 'navbar--scrolled' : ''} ${estaMenuMovilAbierto ? 'navbar--menu-abierto' : ''}`}
        role="navigation"
        aria-label="Navegación principal"
      >
        {/* Logo */}
        <Link to="/" className="navbar__logo" aria-label="TravelBqto — inicio">
          <LogoMarca
            sobreOscuro={estaMenuMovilAbierto || (esPaginaPrincipal && !estaScrolleado)}
          />
        </Link>

        {/* Links */}
        <div className={`navbar__links ${estaMenuMovilAbierto ? 'navbar__links--open' : ''}`}>
          {enlacesNavegacion.map((enlace) => (
            <Link
              key={enlace.to}
              to={enlace.to}
              className={`navbar__link ${
                enlace.to === '/'
                  ? ubicacion.pathname === '/' && !ubicacion.hash
                    ? 'navbar__link--active'
                    : ''
                  : enlace.to.startsWith('/#')
                    ? ubicacion.pathname === '/' && ubicacion.hash === enlace.to.slice(1)
                      ? 'navbar__link--active'
                      : ''
                    : ubicacion.pathname === enlace.to
                      ? 'navbar__link--active'
                      : ''
              }`}
              onClick={() => setEstaMenuMovilAbierto(false)}
            >
              {enlace.label}
            </Link>
          ))}
          {estaAutenticado ? (
            <Link to={esAdmin ? "/admin" : "/client/dashboard"} className="navbar__admin-btn" onClick={() => setEstaMenuMovilAbierto(false)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Mi Portal
            </Link>
          ) : (
            <Link to="/iniciar-sesion" className="navbar__admin-btn" onClick={() => setEstaMenuMovilAbierto(false)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              Acceso
            </Link>
          )}
        </div>

        {/* Hamburger (Móvil) */}
        <button
          className={`navbar__toggle ${estaMenuMovilAbierto ? 'navbar__toggle--open' : ''}`}
          onClick={() => setEstaMenuMovilAbierto(!estaMenuMovilAbierto)}
          aria-label={estaMenuMovilAbierto ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={estaMenuMovilAbierto}
        >
          <span />
          <span />
          <span />
        </button>
      </nav>

      {/* CONTENIDO DE LA PÁGINA */}
      <main className="layout-publico__content">
        <Outlet />
      </main>

      {/* FOOTER  */}
      <footer className="footer" id="contacto" role="contentinfo">
        <div className="footer__content">
          {/* Marca */}
          <div className="footer__brand">
            <div className="footer__brand-logo">
              <LogoMarca compacto />
            </div>
            <p className="footer__brand-desc">
              Descubre destinos turísticos en todo el país.
              Vive experiencias únicas con los mejores precios.
            </p>
          </div>

          {/* Explorar */}
          <div>
            <h4 className="footer__section-title">Explorar</h4>
            <div className="footer__links">
              <Link to="/" className="footer__link">Inicio</Link>
              <Link to="/#destinos" className="footer__link">Destinos</Link>
              <Link to="/agenda" className="footer__link">Agenda de viajes</Link>
              <Link to="/#nosotros" className="footer__link">Sobre Nosotros</Link>
              <Link to="/#contacto" className="footer__link">Contacto</Link>
            </div>
          </div>

          {/* Destinos */}
          <div>
            <h4 className="footer__section-title">Destinos</h4>
            <div className="footer__links">
              <Link to="/#destinos" className="footer__link">Ver catálogo</Link>
              <Link to="/agenda" className="footer__link">Próximas salidas</Link>
              <Link to="/iniciar-sesion" className="footer__link">Reservar ahora</Link>
            </div>
          </div>

          {/* Legal */}
          <div>
            <h4 className="footer__section-title">Legal</h4>
            <div className="footer__links">
              <a href="mailto:info@travelbqto.com" className="footer__link">info@travelbqto.com</a>
              <Link to="/registro" className="footer__link">Crear cuenta</Link>
              <Link to="/iniciar-sesion" className="footer__link">Iniciar sesión</Link>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="footer__bottom">
          <p>© {new Date().getFullYear()} TravelBqto. Todos los derechos reservados.</p>
          <div className="footer__social">
            <a href="#" className="footer__social-link" aria-label="Instagram">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
              </svg>
            </a>
            <a href="#" className="footer__social-link" aria-label="Facebook">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                <path d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H8v3h2v7h3v-7h2.6l.4-3H13v-2c0-.6.4-1 1-1z" />
              </svg>
            </a>
            <a href="#" className="footer__social-link" aria-label="X">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                <path d="M14.7 10.3 21 3h-2.2l-4.8 5.5L9.8 3H3l6.6 9.6L3 21h2.2l5.2-6 4.2 6H21l-6.3-10.7z" />
              </svg>
            </a>
            <a href="#" className="footer__social-link" aria-label="WhatsApp">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                <path d="M12 3a8.5 8.5 0 0 0-7.4 12.7L3.6 20.4l4.8-1.3A8.5 8.5 0 1 0 12 3zm4.7 12c-.2.5-1.1 1-1.6 1.1-.4.1-.9.2-2.9-.6-2.4-1-4-3.5-4.1-3.7-.1-.2-1-1.3-1-2.5s.6-1.8.9-2c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5.2.5.8 2 .8 2.1.1.1 0 .3-.1.4l-.4.5c-.1.1-.3.3-.1.5.1.3.7 1.1 1.5 1.8 1 .9 1.8 1.1 2.1 1.3.3.1.4.1.6-.1l.7-.8c.2-.2.4-.2.6-.1.2.1 1.6.8 1.9.9.3.1.5.2.5.3.1.2 0 .8-.3 1.3z" />
              </svg>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
