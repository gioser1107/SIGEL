import { useCallback, useState } from 'react';
import { ErrorApi } from '../services/api';
import { obtenerDetallePagoPortal } from '../services/pagosPortal';
import type { PagoPortalDetalle } from '../types/pagosPortal';

function mensajeError(err: unknown): string {
  if (err instanceof ErrorApi || err instanceof Error) return err.message;
  return 'No se pudo cargar el detalle del pago.';
}

export function useDetallePagoPortal() {
  const [detalle, setDetalle] = useState<PagoPortalDetalle | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async (reservaId: number, pagoId: number) => {
    setCargando(true);
    setError(null);
    try {
      const data = await obtenerDetallePagoPortal(reservaId, pagoId);
      setDetalle(data);
      return data;
    } catch (err) {
      const msg = mensajeError(err);
      setError(msg);
      setDetalle(null);
      throw err;
    } finally {
      setCargando(false);
    }
  }, []);

  const limpiar = useCallback(() => {
    setDetalle(null);
    setError(null);
  }, []);

  return { detalle, cargando, error, cargar, limpiar };
}
