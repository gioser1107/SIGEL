import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom';
import useAutenticacion from '../../../hooks/useAutenticacion';
import { useNotificaciones } from '../../../hooks/useNotificaciones';
import { nombreCompleto } from '../../../utils/nombrePersona';
import { esRolClientePortal } from '../../../utils/permisosModulos';
import PanelNotificaciones from './PanelNotificaciones';
import './LayoutAdmin.css';

function iniciales(nombre: string): string {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export default function LayoutAdmin() {
  const [estaColapsado, setEstaColapsado] = useState(false);
  const [estaAbiertoMovil, setEstaAbiertoMovil] = useState(false);
  const [panelNotificacionesAbierto, setPanelNotificacionesAbierto] = useState(false);
  
  const ubicacion = useLocation();
  const [menusAbiertos, setMenusAbiertos] = useState<Record<string, boolean>>(() => ({
    reportes:
      ubicacion.pathname.startsWith('/admin/reportes') ||
      ubicacion.pathname.includes('/admin/reporte-viaje'),
    configuracion:
      ubicacion.pathname.includes('/admin/bitacora') ||
      ubicacion.pathname.includes('/admin/usuarios-roles'),
  }));
  const contenedorNotificacionesRef = useRef<HTMLDivElement>(null);
  const { usuario, cerrarSesion, puedeLeer, puedeAccederSeguridad } = useAutenticacion();
  const notificaciones = useNotificaciones();

  useEffect(() => {
    setEstaAbiertoMovil(false);
    setPanelNotificacionesAbierto(false);
    if (
      ubicacion.pathname.startsWith('/admin/reportes') ||
      ubicacion.pathname.includes('/admin/reporte-viaje')
    ) {
      setMenusAbiertos((prev) => ({ ...prev, reportes: true }));
    }
    if (
      ubicacion.pathname.includes('/admin/bitacora') ||
      ubicacion.pathname.includes('/admin/usuarios-roles')
    ) {
      setMenusAbiertos((prev) => ({ ...prev, configuracion: true }));
    }
  }, [ubicacion.pathname]);

  useEffect(() => {
    if (!panelNotificacionesAbierto) return;

    function cerrarAlClickExterno(evento: MouseEvent) {
      if (
        contenedorNotificacionesRef.current &&
        !contenedorNotificacionesRef.current.contains(evento.target as Node)
      ) {
        setPanelNotificacionesAbierto(false);
      }
    }

    document.addEventListener('mousedown', cerrarAlClickExterno);
    return () => document.removeEventListener('mousedown', cerrarAlClickExterno);
  }, [panelNotificacionesAbierto]);

  if (esRolClientePortal(usuario?.rol)) {
    return <Navigate to="/client/dashboard" replace />;
  }

  const enlacesBarraLateral = [
    {
      to: '/admin/dashboard',
      label: 'Dashboard',
      visible: true,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="9" rx="1" />
          <rect x="14" y="3" width="7" height="5" rx="1" />
          <rect x="14" y="12" width="7" height="9" rx="1" />
          <rect x="3" y="16" width="7" height="5" rx="1" />
        </svg>
      )
    },
    {
      to: '/admin/destinos',
      label: 'Destinos',
      visible: puedeLeer('destinos'),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
          <line x1="9" y1="3" x2="9" y2="18" />
          <line x1="15" y1="6" x2="15" y2="21" />
        </svg>
      )
    },
    {
      to: '/admin/planificacion',
      label: 'Planificación',
      visible: puedeLeer('planificacion'),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="3" width="15" height="13" rx="2" />
          <path d="M16 8h4l3 3v5a2 2 0 0 1-2 2h-1" />
          <circle cx="5.5" cy="18.5" r="2.5" />
          <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
      )
    },
    {
      to: '/admin/flota',
      label: 'Flota',
      visible: puedeLeer('transporte_flota'),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="11" rx="2" ry="2" />
          <path d="M2 13h20" />
          <path d="M6 7v-2a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v2" />
          <circle cx="7" cy="18" r="2" />
          <circle cx="17" cy="18" r="2" />
        </svg>
      )
    },
    {
      to: '/admin/cotizaciones',
      label: 'Cotizaciones',
      visible: puedeLeer('cotizaciones'),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      )
    },
    {
      to: '/admin/clientes',
      label: 'Clientes',
      visible: puedeLeer('clientes'),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
    {
      to: '/admin/puntos-recogida',
      label: 'Puntos recogida',
      visible: puedeLeer('puntos_recogida'),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 21s7-4.35 7-10a7 7 0 1 0-14 0c0 5.65 7 10 7 10z" />
          <circle cx="12" cy="11" r="2.5" />
        </svg>
      ),
    },
    {
      id: 'reportes',
      label: 'Reportes',
      visible:
        puedeLeer('reservas') ||
        puedeLeer('reportes_pago') ||
        puedeLeer('clientes') ||
        puedeLeer('planificacion'),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      ),
      subItems: [
        {
          to: '/admin/reportes',
          label: 'Estadísticos',
          visible: puedeLeer('reservas') || puedeLeer('reportes_pago') || puedeLeer('clientes'),
        },
        {
          to: '/admin/reporte-viaje',
          label: 'Operativo de viaje',
          visible: puedeLeer('planificacion'),
        },
      ],
    },
    {
      to: '/admin/abordaje',
      label: 'Abordaje',
      visible: puedeLeer('abordaje'),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 3h5v5" />
          <path d="M8 3H3v5" />
          <path d="M12 22v-8" />
          <path d="M3 12h18" />
          <path d="m21 3-9 9" />
          <path d="m3 3 9 9" />
        </svg>
      ),
    },
    {
      to: '/admin/reservas',
      label: 'Reservas',
      visible: puedeLeer('reservas'),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      )
    },
    {
      to: '/admin/pagos',
      label: 'Pagos',
      visible: puedeLeer('reportes_pago'),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
          <line x1="1" y1="10" x2="23" y2="10" />
        </svg>
      ),
    },
    {
      to: '/admin/resenas',
      label: 'Reseñas',
      visible: puedeLeer('resenas'),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ),
    },
    {
      id: 'configuracion',
      label: 'Configuración',
      visible: puedeLeer('bitacora') || puedeAccederSeguridad(),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      ),
      subItems: [
        {
          to: '/admin/bitacora',
          label: 'Bitácora',
          visible: puedeLeer('bitacora')
        },
        {
          to: '/admin/usuarios-roles',
          label: 'Usuarios y roles',
          visible: puedeAccederSeguridad()
        }
      ]
    },
  ].filter((enlace) => enlace.visible);

  return (
    <div className="layout-admin">
      {/* OVERLAY MÓVIL — solo en DOM cuando está abierto (evita blur fantasma al navegar) */}
      {estaAbiertoMovil && (
        <div
          className="barra-lateral__superposicion barra-lateral__superposicion--visible"
          onClick={() => setEstaAbiertoMovil(false)}
          aria-hidden="true"
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`barra-lateral ${estaColapsado ? 'barra-lateral--colapsada' : ''} ${estaAbiertoMovil ? 'barra-lateral--abierta-movil' : ''}`}
        role="navigation"
        aria-label="Navegación del panel administrativo"
      >
        {/* Logo */}
        <div className="barra-lateral__cabecera">
          <div className="barra-lateral__logo-icono">✈</div>
          <span className="barra-lateral__logo-texto">
            Travel<span>Bqto</span>
          </span>
          <button
            className="barra-lateral__boton-colapsar-top"
            onClick={() => setEstaColapsado(!estaColapsado)}
            aria-label={estaColapsado ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {estaColapsado ? (
                <polyline points="9 18 15 12 9 6" /> /* Flecha apuntando a la derecha para expandir */
              ) : (
                <polyline points="15 18 9 12 15 6" /> /* Flecha apuntando a la izquierda para colapsar */
              )}
            </svg>
          </button>
        </div>

        {/* Etiqueta */}
        <div className="barra-lateral__etiqueta">Menú</div>

        {/* Links de Navegación */}
        <nav className="barra-lateral__navegacion">
          {enlacesBarraLateral.map((enlace) => {
            if ('subItems' in enlace && enlace.subItems) {
              const itemsVisibles = enlace.subItems.filter((s: { visible?: boolean }) => s.visible);
              if (itemsVisibles.length === 0) return null;
              const idGrupo = String(enlace.id || enlace.label);
              const abierto = Boolean(menusAbiertos[idGrupo]);

              return (
                <div key={idGrupo} className="barra-lateral__grupo">
                  <button
                    className={`barra-lateral__enlace barra-lateral__boton-acordeon ${abierto && !estaColapsado ? 'barra-lateral__boton-acordeon--abierto' : ''}`}
                    onClick={() => {
                      setMenusAbiertos((prev) => ({ ...prev, [idGrupo]: !prev[idGrupo] }));
                      if (estaColapsado) setEstaColapsado(false);
                    }}
                  >
                    <span className="barra-lateral__enlace-icono">{enlace.icon}</span>
                    <span className="barra-lateral__enlace-texto">{enlace.label}</span>
                    <span className="barra-lateral__chevron">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </span>
                  </button>
                  {abierto && !estaColapsado && (
                    <div className="barra-lateral__sub-navegacion">
                      {itemsVisibles.map((sub: { to: string; label: string }) => (
                        <NavLink
                          key={sub.to}
                          to={sub.to}
                          className={({ isActive }) =>
                            `barra-lateral__enlace barra-lateral__sub-enlace ${isActive ? 'barra-lateral__enlace--activo' : ''}`
                          }
                          onClick={() => setEstaAbiertoMovil(false)}
                        >
                          <span className="barra-lateral__enlace-texto">{sub.label}</span>
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <NavLink
                key={enlace.to}
                to={enlace.to as string}
                className={({ isActive }) =>
                  `barra-lateral__enlace ${isActive ? 'barra-lateral__enlace--activo' : ''}`
                }
                onClick={() => setEstaAbiertoMovil(false)}
              >
                <span className="barra-lateral__enlace-icono">{enlace.icon}</span>
                <span className="barra-lateral__enlace-texto">{enlace.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer del Sidebar */}
        <div className="barra-lateral__pie">
          <button className="barra-lateral__boton-cerrar-sesion" onClick={cerrarSesion}>
            <span className="barra-lateral__enlace-icono">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </span>
            <span className="barra-lateral__enlace-texto">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <div className={`admin-principal ${estaColapsado ? 'admin-principal--expandido' : ''}`}>
        {/* Header */}
        <header className="admin-cabecera">
          <div className="admin-cabecera__izquierda">
            {/* Toggle móvil */}
            <button
              className="admin-cabecera__alternador-movil"
              onClick={() => setEstaAbiertoMovil(!estaAbiertoMovil)}
              aria-label="Abrir menú lateral"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div className="admin-cabecera__buscador">
              <span className="admin-cabecera__buscador-icono">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
              <input type="text" placeholder="Buscar reservas, destinos..." aria-label="Buscador global" />
            </div>
          </div>

          <div className="admin-cabecera__derecha">
            {/* Notificaciones */}
            <div className="admin-notificaciones" ref={contenedorNotificacionesRef}>
              <button
                type="button"
                className="admin-cabecera__notificacion"
                aria-label="Notificaciones"
                aria-expanded={panelNotificacionesAbierto}
                onClick={() => {
                  setPanelNotificacionesAbierto((abierto) => {
                    const nuevoEstado = !abierto;
                    if (nuevoEstado) notificaciones.recargar();
                    return nuevoEstado;
                  });
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {notificaciones.total > 0 && (
                  <span className="admin-cabecera__notificacion-insignia">
                    {notificaciones.total > 99 ? '99+' : notificaciones.total}
                  </span>
                )}
              </button>
              {panelNotificacionesAbierto && (
                <PanelNotificaciones
                  datos={notificaciones}
                  onCerrar={() => setPanelNotificacionesAbierto(false)}
                  puedeVerCotizaciones={puedeLeer('cotizaciones')}
                  puedeVerReservas={puedeLeer('reservas')}
                />
              )}
            </div>

            {/* Avatar & Perfil Info */}
            <div className="admin-cabecera__perfil">
              <div className="admin-cabecera__avatar">
                {usuario ? iniciales(nombreCompleto(usuario.nombre, usuario.apellido)) : '—'}
              </div>
              <div className="admin-cabecera__perfil-info">
                <span className="admin-cabecera__perfil-nombre">
                  {usuario ? nombreCompleto(usuario.nombre, usuario.apellido) : 'Usuario'}
                </span>
                <span className="admin-cabecera__perfil-rol">{usuario?.rol ?? '—'}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Contenido de la página */}
        <main className="admin-contenido">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

