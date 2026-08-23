/**
 * RutaPrivada — Protege rutas que requieren sesión y/o permisos.
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAutenticacion from '../../hooks/useAutenticacion';
import type { AccionPermiso } from '../../utils/permisosModulos';
import './RutaPrivada.css';

interface RutaPrivadaProps {
  /** Permiso exacto (ej: leer_clientes). */
  permiso?: string;
  /** Basta con tener al menos uno de estos permisos exactos. */
  permisos?: string[];
  /** Módulo del seeder (ej: clientes). Por defecto exige permiso de lectura. */
  modulo?: string;
  /** Varios módulos: basta acceso de lectura a uno. */
  modulos?: string[];
  accionModulo?: AccionPermiso;
  /** Exige rol Cliente con perfil vinculado (portal de pasajeros). */
  requiereCliente?: boolean;
  redirigirA?: string;
  children?: React.ReactNode;
}

export default function RutaPrivada({
  permiso,
  permisos,
  modulo,
  modulos,
  accionModulo = 'leer',
  requiereCliente = false,
  redirigirA = '/iniciar-sesion',
  children,
}: RutaPrivadaProps) {
  const {
    estaAutenticado,
    estaCargando,
    tienePermiso,
    puedeModulo,
    esCliente,
    usuario,
  } = useAutenticacion();
  const ubicacion = useLocation();

  const accesoPermitido = (() => {
    if (modulos && modulos.length > 0) {
      return modulos.some((m) => puedeModulo(m, accionModulo));
    }
    if (modulo) {
      return puedeModulo(modulo, accionModulo);
    }
    if (permisos && permisos.length > 0) {
      return permisos.some((p) => tienePermiso(p));
    }
    if (permiso) return tienePermiso(permiso);
    return true;
  })();

  if (estaCargando) {
    return (
      <div className="ruta-privada__cargando">
        <p>Verificando sesión…</p>
      </div>
    );
  }

  if (!estaAutenticado) {
    return <Navigate to={redirigirA} state={{ desde: ubicacion }} replace />;
  }

  if (requiereCliente && !esCliente) {
    const rolActual = usuario?.rol ?? 'sin rol';
    const sinPerfil = usuario?.cliente_id == null;
    return (
      <div className="ruta-privada__denegado">
        <h2>Acceso solo para clientes</h2>
        <p>
          {sinPerfil
            ? 'Tu cuenta no tiene un perfil de cliente vinculado. Regístrate en el portal o inicia sesión con una cuenta de cliente.'
            : `Tu rol actual es «${rolActual}». Cierra sesión e inicia con una cuenta de cliente para reservar viajes.`}
        </p>
      </div>
    );
  }

  if ((permiso || permisos || modulo || modulos) && !accesoPermitido) {
    return (
      <div className="ruta-privada__denegado">
        <h2>Acceso denegado</h2>
        <p>No tienes permiso para acceder a esta sección.</p>
      </div>
    );
  }

  return children ? <>{children}</> : <Outlet />;
}
