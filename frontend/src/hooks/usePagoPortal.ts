import { useCallback, useEffect, useState } from 'react';
import { ErrorApi } from '../services/api';
import {
  cotizarPago,
  getResumenPago,
  metodoPagoIdPorCodigo,
  obtenerBancoDestinoId,
  reportarPago,
} from '../services/pagosPortal';
import type {
  MetodoPagoPortalCodigo,
  ReportarPagoPortalDTO,
  ResumenPagoPortal,
} from '../types/pagosPortal';

function mensajeError(err: unknown): string {
  if (err instanceof ErrorApi || err instanceof Error) return err.message;
  return 'No se pudo procesar el pago.';
}

export function usePagoPortal(reservaId: number | null) {
  const [resumenPortal, setResumenPortal] = useState<ResumenPagoPortal | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    if (!reservaId) return;
    setCargando(true);
    setError(null);
    try {
      setResumenPortal(await getResumenPago(reservaId));
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  }, [reservaId]);

  useEffect(() => {
    if (reservaId) void recargar();
    else setResumenPortal(null);
  }, [reservaId, recargar]);

  const tasaId = resumenPortal?.tasa_eur?.tasa?.id ?? null;
  const sinTasa = !tasaId;

  const cotizarMontoEur = useCallback(
    async (montoEur: number, codigoMetodo: MetodoPagoPortalCodigo) => {
      if (!reservaId || !resumenPortal || !tasaId) {
        throw new Error('No hay tasa de cambio disponible para cotizar.');
      }
      const metodoPagoId = metodoPagoIdPorCodigo(resumenPortal, codigoMetodo);
      if (!metodoPagoId) {
        throw new Error('Método de pago no disponible.');
      }
      return cotizarPago(reservaId, {
        monto_eur: montoEur,
        metodo_pago_id: metodoPagoId,
        tasa_id: tasaId,
      });
    },
    [reservaId, resumenPortal, tasaId],
  );

  const reportar = useCallback(
    async (body: ReportarPagoPortalDTO) => {
      if (!reservaId) throw new Error('Reserva no disponible.');
      const respuesta = await reportarPago(reservaId, body);
      await recargar();
      return respuesta;
    },
    [reservaId, recargar],
  );

  return {
    resumenPortal,
    cargando,
    error,
    sinTasa,
    tasaId,
    recargar,
    cotizarMontoEur,
    reportar,
    obtenerBancoDestinoId: () =>
      resumenPortal ? obtenerBancoDestinoId(resumenPortal) : null,
    metodoPagoIdPorCodigo: (codigo: MetodoPagoPortalCodigo) =>
      resumenPortal ? metodoPagoIdPorCodigo(resumenPortal, codigo) : undefined,
  };
}
