import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom';
import useAutenticacion from '../../../hooks/useAutenticacion';
import { useNotificaciones } from '../../../hooks/useNotificaciones';
import { nombreCompleto } from '../../../utils/nombrePersona';
import { esRolClientePortal } from '../../../utils/permisosModulos';
import PanelNotificaciones from './PanelNotificaciones';
import MenuUsuario from '../MenuUsuario/MenuUsuario';
import LogoMarca from '../../ui/LogoMarca/LogoMarca';
import './LayoutAdmin.css';

const RUTAS_POR_GRUPO: Record<string, string[]> = {
  operacion: ['/admin/planificacion', '/admin/reservas', '/admin/abordaje', '/admin/pagos'],
  comercial: ['/admin/cotizaciones', '/admin/clientes', '/admin/resenas'],
  catalogos: ['/admin/destinos', '/admin/flota', '/admin/puntos-recogida'],
  reportes: ['/admin/reportes', '/admin/reporte-viaje'],
  configuracion: ['/admin/bitacora', '/admin/usuarios-roles'],
};

function rutaEstaActiva(pathname: string, to: string): boolean {
  return pathname === to || pathname.startsWith(`${to}/`);
}

function grupoPorRuta(pathname: string): string | null {
  for (const [id, rutas] of Object.entries(RUTAS_POR_GRUPO)) {
    if (rutas.some((ruta) => rutaEstaActiva(pathname, ruta))) {
      return id;
    }
  }
  return null;
}

function iniciales(nombre: string): string {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

type SubEnlaceMenu = {
  to: string;
  label: string;
  visible: boolean;
};

type EnlaceMenu =
  | {
      to: string;
      label: string;
      visible: boolean;
      icon: ReactNode;
    }
  | {
      id: string;
      label: string;
      visible: boolean;
      icon: ReactNode;
      subItems: SubEnlaceMenu[];
    };

export default function LayoutAdmin() {
  const [estaColapsado, setEstaColapsado] = useState(false);
  const [estaAbiertoMovil, setEstaAbiertoMovil] = useState(false);
  const [panelNotificacionesAbierto, setPanelNotificacionesAbierto] = useState(false);
  
  const ubicacion = useLocation();
  const [menusAbiertos, setMenusAbiertos] = useState<Record<string, boolean>>(() => {
    const grupo = grupoPorRuta(ubicacion.pathname);
    return grupo ? { [grupo]: true } : {};
  });
  const contenedorNotificacionesRef = useRef<HTMLDivElement>(null);
  const { usuario, cerrarSesion, puedeLeer, puedeAccederSeguridad } = useAutenticacion();
  const notificaciones = useNotificaciones();

  useEffect(() => {
    setEstaAbiertoMovil(false);
    setPanelNotificacionesAbierto(false);
    const grupo = grupoPorRuta(ubicacion.pathname);
    setMenusAbiertos(grupo ? { [grupo]: true } : {});
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

  const enlacesBarraLateral: EnlaceMenu[] = [
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
      ),
    },
    {
      id: 'operacion',
      label: 'Operación',
      visible:
        puedeLeer('planificacion') ||
        puedeLeer('reservas') ||
        puedeLeer('abordaje') ||
        puedeLeer('reportes_pago'),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="8" y="2" width="8" height="4" rx="1" />
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <path d="M9 12h6" />
          <path d="M9 16h6" />
        </svg>
      ),
      subItems: [
        {
          to: '/admin/planificacion',
          label: 'Planificación',
          visible: puedeLeer('planificacion'),
        },
        {
          to: '/admin/reservas',
          label: 'Reservas',
          visible: puedeLeer('reservas'),
        },
        {
          to: '/admin/abordaje',
          label: 'Abordaje',
          visible: puedeLeer('abordaje'),
        },
        {
          to: '/admin/pagos',
          label: 'Pagos',
          visible: puedeLeer('reportes_pago'),
        },
      ],
    },
    {
      id: 'comercial',
      label: 'Comercial',
      visible: puedeLeer('cotizaciones') || puedeLeer('clientes') || puedeLeer('resenas'),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
      subItems: [
        {
          to: '/admin/cotizaciones',
          label: 'Cotizaciones',
          visible: puedeLeer('cotizaciones'),
        },
        {
          to: '/admin/clientes',
          label: 'Clientes',
          visible: puedeLeer('clientes'),
        },
        {
          to: '/admin/resenas',
          label: 'Reseñas',
          visible: puedeLeer('resenas'),
        },
      ],
    },
    {
      id: 'catalogos',
      label: 'Catálogos',
      visible: puedeLeer('destinos') || puedeLeer('transporte_flota') || puedeLeer('puntos_recogida'),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      ),
      subItems: [
        {
          to: '/admin/destinos',
          label: 'Destinos',
          visible: puedeLeer('destinos'),
        },
        {
          to: '/admin/flota',
          label: 'Flota',
          visible: puedeLeer('transporte_flota'),
        },
        {
          to: '/admin/puntos-recogida',
          label: 'Puntos recogida',
          visible: puedeLeer('puntos_recogida'),
        },
      ],
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
          visible: puedeLeer('bitacora'),
        },
        {
          to: '/admin/usuarios-roles',
          label: 'Usuarios y roles',
          visible: puedeAccederSeguridad(),
        },
      ],
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
          <LogoMarca compacto />
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
            if ('subItems' in enlace) {
              const itemsVisibles = enlace.subItems.filter((s) => s.visible);
              if (itemsVisibles.length === 0) return null;
              const idGrupo = enlace.id;
              const abierto = Boolean(menusAbiertos[idGrupo]);
              const tieneActivo = itemsVisibles.some((sub) =>
                rutaEstaActiva(ubicacion.pathname, sub.to)
              );

              return (
                <div key={idGrupo} className="barra-lateral__grupo">
                  <button
                    type="button"
                    title={enlace.label}
                    aria-expanded={abierto && !estaColapsado}
                    className={`barra-lateral__enlace barra-lateral__boton-acordeon${
                      abierto && !estaColapsado ? ' barra-lateral__boton-acordeon--abierto' : ''
                    }${tieneActivo ? ' barra-lateral__boton-acordeon--activo' : ''}`}
                    onClick={() => {
                      setMenusAbiertos((prev) => ({ [idGrupo]: !prev[idGrupo] }));
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
                      {itemsVisibles.map((sub) => (
                        <NavLink
                          key={sub.to}
                          to={sub.to}
                          title={sub.label}
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
                to={enlace.to}
                title={enlace.label}
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
            <MenuUsuario triggerClassName="admin-cabecera__perfil">
              <div className="admin-cabecera__avatar">
                {usuario ? iniciales(nombreCompleto(usuario.nombre, usuario.apellido)) : '—'}
              </div>
              <div className="admin-cabecera__perfil-info">
                <span className="admin-cabecera__perfil-nombre">
                  {usuario ? nombreCompleto(usuario.nombre, usuario.apellido) : 'Usuario'}
                </span>
                <span className="admin-cabecera__perfil-rol">{usuario?.rol ?? '—'}</span>
              </div>
            </MenuUsuario>
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

