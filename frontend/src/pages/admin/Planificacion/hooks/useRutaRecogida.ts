import { useCallback, useEffect, useMemo, useState } from 'react';
import { ErrorApi } from '../../../../services/api';
import {
  guardarRutaRecogida,
  obtenerCandidatosRutaRecogida,
  obtenerRutaRecogida,
} from '../../../../services/viajes';
import type {
  CandidatoRutaRecogida,
  RespuestaCandidatosRutaRecogida,
} from '../../../../types/viaje';
import {
  candidatoAParadaLocal,
  paradaApiALocal,
  paradasLocalesADto,
  reordenarParadas,
  type ParadaRutaLocal,
} from '../utils/rutaRecogidaUi';

interface UseRutaRecogidaParams {
  viajeId: number | null;
  fechaSalida: string;
  activo: boolean;
}

function mensajeError(err: unknown): string {
  if (err instanceof ErrorApi || err instanceof Error) return err.message;
  return 'No se pudo actualizar la ruta de recogida.';
}

export function useRutaRecogida({ viajeId, fechaSalida, activo }: UseRutaRecogidaParams) {
  const [resumen, setResumen] = useState<RespuestaCandidatosRutaRecogida | null>(null);
  const [paradas, setParadas] = useState<ParadaRutaLocal[]>([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!viajeId) return;
    setCargando(true);
    setError(null);
    try {
      const [candidatosResp, rutaResp] = await Promise.all([
        obtenerCandidatosRutaRecogida(viajeId),
        obtenerRutaRecogida(viajeId),
      ]);
      setResumen(candidatosResp);
      setParadas(rutaResp.map((p) => paradaApiALocal(p, fechaSalida)));
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  }, [viajeId, fechaSalida]);

  useEffect(() => {
    if (activo && viajeId) {
      void cargar();
    } else if (!activo) {
      setResumen(null);
      setParadas([]);
      setError(null);
    }
  }, [activo, viajeId, cargar]);

  const clientesEnRuta = useMemo(
    () => new Set(paradas.map((p) => p.cliente.id)),
    [paradas],
  );

  const pendientes = useMemo(() => {
    if (!resumen) return [];
    const filtrados = resumen.candidatos.filter(
      (c) => !c.en_ruta && !clientesEnRuta.has(c.cliente.id) && c.domicilio,
    );
    const porCliente = new Map<number, (typeof filtrados)[number]>();
    for (const candidato of filtrados) {
      const clienteId = candidato.cliente.id;
      const actual = porCliente.get(clienteId);
      if (!actual || candidato.reserva_id > actual.reserva_id) {
        porCliente.set(clienteId, candidato);
      }
    }
    return Array.from(porCliente.values());
  }, [resumen, clientesEnRuta]);

  const sinDomicilio = useMemo(() => {
    if (!resumen) return [];
    return resumen.candidatos.filter((c) => !c.domicilio);
  }, [resumen]);

  const persistir = useCallback(
    async (nuevaParadas: ParadaRutaLocal[]) => {
      if (!viajeId) return;
      setGuardando(true);
      setError(null);
      try {
        await guardarRutaRecogida(viajeId, {
          paradas: paradasLocalesADto(nuevaParadas, fechaSalida),
        });
        setParadas(nuevaParadas.map((p, i) => ({ ...p, orden: i + 1 })));
        const candidatosResp = await obtenerCandidatosRutaRecogida(viajeId);
        setResumen(candidatosResp);
      } catch (err) {
        setError(mensajeError(err));
        throw err;
      } finally {
        setGuardando(false);
      }
    },
    [viajeId, fechaSalida],
  );

  const agregarCandidato = useCallback(
    async (candidato: CandidatoRutaRecogida, indice?: number) => {
      const nueva = candidatoAParadaLocal(candidato, paradas.length + 1);
      if (!nueva) {
        setError(`${candidato.cliente.nombre} no tiene domicilio registrado.`);
        return;
      }
      const copia = [...paradas];
      const pos = indice == null || indice < 0 || indice > copia.length ? copia.length : indice;
      copia.splice(pos, 0, nueva);
      await persistir(copia);
    },
    [paradas, persistir],
  );

  const quitarParada = useCallback(
    async (reservaClienteId: number) => {
      await persistir(paradas.filter((p) => p.reserva_cliente_id !== reservaClienteId));
    },
    [paradas, persistir],
  );

  const reordenar = useCallback(
    async (desde: number, hacia: number) => {
      await persistir(reordenarParadas(paradas, desde, hacia));
    },
    [paradas, persistir],
  );

  const actualizarParada = useCallback(
    async (
      reservaClienteId: number,
      cambios: Partial<Pick<ParadaRutaLocal, 'horaLocal' | 'notas'>>,
    ) => {
      const copia = paradas.map((p) =>
        p.reserva_cliente_id === reservaClienteId ? { ...p, ...cambios } : p,
      );
      await persistir(copia);
    },
    [paradas, persistir],
  );

  const limpiarRuta = useCallback(async () => {
    await persistir([]);
  }, [persistir]);

  return {
    resumen,
    paradas,
    pendientes,
    sinDomicilio,
    cargando,
    guardando,
    error,
    cargar,
    agregarCandidato,
    quitarParada,
    reordenar,
    actualizarParada,
    limpiarRuta,
  };
}
