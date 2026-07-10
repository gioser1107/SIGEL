import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { obtenerCotizaciones } from '../services/cotizaciones';
import { obtenerReservas } from '../services/reservas';
import { LIMITE_PAGINA_MAX } from '../types/paginacion';
import { EVENTO_INVALIDAR_NOTIFICACIONES } from '../utils/notificacionesEventos';
import useAutenticacion from './useAutenticacion';

export interface NotificacionesAdmin {
  total: number;
  cotizacionesPendientes: number;
  reservasPendientes: number;
  cargando: boolean;
  recargar: () => void;
}

export function useNotificaciones(): NotificacionesAdmin {
  const { puedeLeer } = useAutenticacion();
  const ubicacion = useLocation();
  const [cotizacionesPendientes, setCotizacionesPendientes] = useState(0);
  const [reservasPendientes, setReservasPendientes] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [version, setVersion] = useState(0);
  const haCargadoRef = useRef(false);
  const rutaAnteriorRef = useRef(ubicacion.pathname);

  const recargar = useCallback(() => {
    setVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    const manejarInvalidacion = () => recargar();
    window.addEventListener(EVENTO_INVALIDAR_NOTIFICACIONES, manejarInvalidacion);
    return () => window.removeEventListener(EVENTO_INVALIDAR_NOTIFICACIONES, manejarInvalidacion);
  }, [recargar]);

  useEffect(() => {
    if (rutaAnteriorRef.current !== ubicacion.pathname) {
      rutaAnteriorRef.current = ubicacion.pathname;
      recargar();
    }
  }, [ubicacion.pathname, recargar]);

  useEffect(() => {
    let activo = true;

    async function cargar() {
      if (!haCargadoRef.current) {
        setCargando(true);
      }

      const puedeCotizaciones = puedeLeer('cotizaciones');
      const puedeReservas = puedeLeer('reservas');

      const promesas: Promise<void>[] = [];

      if (puedeCotizaciones) {
        promesas.push(
          obtenerCotizaciones({ pagina: 1, limite: LIMITE_PAGINA_MAX })
            .then((respuesta) => {
              if (!activo) return;
              const pendientes = respuesta.items.filter(
                (c) => c.estado === 'solicitada' || c.estado === 'pendiente',
              ).length;
              setCotizacionesPendientes(pendientes);
            })
            .catch(() => {
              if (activo) setCotizacionesPendientes(0);
            }),
        );
      } else if (activo) {
        setCotizacionesPendientes(0);
      }

      if (puedeReservas) {
        promesas.push(
          obtenerReservas({ pagina: 1, limite: LIMITE_PAGINA_MAX, estado: 'pendiente' })
            .then((respuesta) => {
              if (!activo) return;
              setReservasPendientes(respuesta.total);
            })
            .catch(() => {
              if (activo) setReservasPendientes(0);
            }),
        );
      } else if (activo) {
        setReservasPendientes(0);
      }

      await Promise.allSettled(promesas);

      if (activo) {
        haCargadoRef.current = true;
        setCargando(false);
      }
    }

    cargar();
    return () => {
      activo = false;
    };
  }, [puedeLeer, version]);

  return {
    total: cotizacionesPendientes + reservasPendientes,
    cotizacionesPendientes,
    reservasPendientes,
    cargando,
    recargar,
  };
}
