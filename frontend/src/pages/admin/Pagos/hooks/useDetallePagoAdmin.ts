import { useCallback, useState } from 'react';
import { ErrorApi } from '../../../../services/api';
import { obtenerPagoReserva } from '../../../../services/pagos';
import type { PagoReserva } from '../../../../types/pagos';

function mensajeError(err: unknown): string {
  if (err instanceof ErrorApi || err instanceof Error) return err.message;
  return 'No se pudo cargar el detalle del pago.';
}

export function useDetallePagoAdmin() {
  const [detalle, setDetalle] = useState<PagoReserva | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(
    async (reservaId: number, pagoId: number, inicial?: PagoReserva | null) => {
      setCargando(true);
      setError(null);
      if (inicial) setDetalle(inicial);

      try {
        const data = await obtenerPagoReserva(reservaId, pagoId);
        setDetalle(data);
        return data;
      } catch (err) {
        const msg = mensajeError(err);
        setError(msg);
        if (!inicial) setDetalle(null);
        throw err;
      } finally {
        setCargando(false);
      }
    },
    [],
  );

  const limpiar = useCallback(() => {
    setDetalle(null);
    setError(null);
  }, []);

  return { detalle, cargando, error, cargar, limpiar };
}
