import { useCallback, useEffect, useState } from 'react';
import { ErrorApi } from '../../../../../services/api';
import {
  listarPagosReserva,
  obtenerCatalogoPagos,
  obtenerResumenPagos,
} from '../../../../../services/pagos';
import { obtenerTasaDelDia } from '../../../../../services/tasas';
import type {
  CatalogoPagos,
  PagoReserva,
  ResumenPagosReserva,
  TasaDelDiaRespuesta,
} from '../../../../../types/pagos';
import { mensajeErrorPago } from '../utils/mensajeError';

interface UsePagosReservaOptions {
  reservaId: number;
  activo?: boolean;
  puedeLeer: boolean;
}

export default function usePagosReserva({
  reservaId,
  activo = true,
  puedeLeer,
}: UsePagosReservaOptions) {
  const [catalogo, setCatalogo] = useState<CatalogoPagos | null>(null);
  const [resumen, setResumen] = useState<ResumenPagosReserva | null>(null);
  const [pagos, setPagos] = useState<PagoReserva[]>([]);
  const [tasaDelDia, setTasaDelDia] = useState<TasaDelDiaRespuesta | null>(null);
  const [sinTasa, setSinTasa] = useState(false);
  const [tasaNoEsDelDia, setTasaNoEsDelDia] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    if (!reservaId || !puedeLeer) return;

    setCargando(true);
    setError(null);

    try {
      const [cat, res, lista, tasaResult] = await Promise.all([
        obtenerCatalogoPagos(),
        obtenerResumenPagos(reservaId),
        listarPagosReserva(reservaId, { pagina: 1, limite: 200 }),
        obtenerTasaDelDia().catch((err) => {
          if (err instanceof ErrorApi && err.status === 404) return null;
          throw err;
        }),
      ]);

      setCatalogo(cat);
      setResumen(res);
      setPagos(lista.items);

      if (tasaResult) {
        setTasaDelDia(tasaResult);
        setSinTasa(false);
        setTasaNoEsDelDia(!tasaResult.es_del_dia);
      } else if (cat.tasa_eur_reciente) {
        setTasaDelDia({
          tasa: cat.tasa_eur_reciente,
          fecha: cat.tasa_eur_reciente.fecha,
          valor: cat.tasa_eur_reciente.valor,
          es_del_dia: false,
        });
        setSinTasa(false);
        setTasaNoEsDelDia(true);
      } else {
        setTasaDelDia(null);
        setSinTasa(true);
        setTasaNoEsDelDia(false);
      }
    } catch (err) {
      setError(mensajeErrorPago(err));
    } finally {
      setCargando(false);
    }
  }, [reservaId, puedeLeer]);

  useEffect(() => {
    if (activo && reservaId && puedeLeer) recargar();
  }, [activo, reservaId, puedeLeer, recargar]);

  return {
    catalogo,
    resumen,
    pagos,
    tasaDelDia,
    sinTasa,
    tasaNoEsDelDia,
    cargando,
    error,
    recargar,
    setError,
  };
}
