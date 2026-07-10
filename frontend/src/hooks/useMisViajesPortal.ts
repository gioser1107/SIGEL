import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ErrorApi } from '../services/api';
import { listarMisPagosPortal, listarMisReservasPortal } from '../services/pagosPortal';
import { LIMITE_PAGINA_MAX } from '../types/paginacion';
import { usePaginacionListado } from './usePaginacionListado';
import type { PagoPortalMis, ReservaPortalMis } from '../types/pagosPortal';

function mensajeError(err: unknown): string {
  if (err instanceof ErrorApi || err instanceof Error) return err.message;
  return 'No se pudieron cargar tus viajes.';
}

export function useMisViajesPortal() {
  const location = useLocation();
  const { pagina, setTotal, total, totalPaginas, irPagina, limite } = usePaginacionListado();
  const [reservas, setReservas] = useState<ReservaPortalMis[]>([]);
  const [pagos, setPagos] = useState<PagoPortalMis[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [listaReservas, listaPagos] = await Promise.all([
        listarMisReservasPortal({ pagina, limite }),
        listarMisPagosPortal({ pagina: 1, limite: LIMITE_PAGINA_MAX }),
      ]);
      setReservas(listaReservas.items);
      setTotal(listaReservas.total);
      setPagos(listaPagos.items);
    } catch (err) {
      setError(mensajeError(err));
      setReservas([]);
      setPagos([]);
      setTotal(0);
    } finally {
      setCargando(false);
    }
  }, [pagina, limite, setTotal]);

  useEffect(() => {
    void recargar();
  }, [recargar, location.pathname]);

  useEffect(() => {
    function alRecuperarFoco() {
      if (document.visibilityState === 'visible') {
        void recargar();
      }
    }
    document.addEventListener('visibilitychange', alRecuperarFoco);
    return () => document.removeEventListener('visibilitychange', alRecuperarFoco);
  }, [recargar]);

  return {
    reservas,
    pagos,
    cargando,
    error,
    recargar,
    pagina,
    total,
    totalPaginas,
    limite,
    irPagina,
  };
}
