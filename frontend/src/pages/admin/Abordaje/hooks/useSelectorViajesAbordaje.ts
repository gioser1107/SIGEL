import { useCallback, useEffect, useState } from 'react';
import { ErrorApi } from '../../../../services/api';
import { listarViajesAbordaje, type FiltrosViajesAbordaje } from '../../../../services/abordaje';
import type { ViajeSelectorAbordaje } from '../../../../types/abordaje';

interface UseSelectorViajesAbordajeOptions {
  filtros: FiltrosViajesAbordaje;
}

export function useSelectorViajesAbordaje({ filtros }: UseSelectorViajesAbordajeOptions) {
  const [viajes, setViajes] = useState<ViajeSelectorAbordaje[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setViajes(await listarViajesAbordaje(filtros));
    } catch (err) {
      setError(
        err instanceof ErrorApi
          ? err.message
          : err instanceof Error
            ? err.message
            : 'No se pudieron cargar los viajes.',
      );
      setViajes([]);
    } finally {
      setCargando(false);
    }
  }, [filtros]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  return { viajes, cargando, error, recargar };
}
