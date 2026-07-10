import { useCallback, useEffect, useMemo, useState } from 'react';
import { ErrorApi } from '../../../../services/api';
import {
  anularAbordaje,
  editarAbordaje,
  marcarAbordajePasajero,
  obtenerManifiestoAbordaje,
  registrarAbordajeLote,
} from '../../../../services/abordaje';
import type {
  EditarAbordajeDTO,
  ManifiestoAbordaje,
  MarcarAbordajeDTO,
  PasajeroManifiesto,
} from '../../../../types/abordaje';

function mensajeError(err: unknown): string {
  if (err instanceof ErrorApi && err.status === 403) {
    return 'No tienes permiso para registrar abordaje.';
  }
  if (err instanceof ErrorApi || err instanceof Error) return err.message;
  return 'Ocurrió un error inesperado.';
}

export function useManifiestoAbordaje(viajeId: number | null) {
  const [manifiesto, setManifiesto] = useState<ManifiestoAbordaje | null>(null);
  const [cargando, setCargando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [seleccionados, setSeleccionados] = useState<Set<string | number>>(new Set());

  const recargar = useCallback(async () => {
    if (!viajeId) return;
    setCargando(true);
    setError(null);
    try {
      setManifiesto(await obtenerManifiestoAbordaje(viajeId));
      setSeleccionados(new Set());
    } catch (err) {
      setError(mensajeError(err));
      setManifiesto(null);
    } finally {
      setCargando(false);
    }
  }, [viajeId]);

  useEffect(() => {
    if (viajeId) recargar();
    else setManifiesto(null);
  }, [viajeId, recargar]);

  const pasajerosFiltrados = useMemo(() => {
    const lista = manifiesto?.pasajeros ?? [];
    const q = busqueda.trim().toLowerCase();
    return lista.filter((p) => {
      const coincideEstado = filtroEstado === 'todos' || p.estado_abordaje === filtroEstado;
      const nombre = `${p.cliente.nombre} ${p.cliente.apellido}`.toLowerCase();
      const doc = `${p.cliente.tipo_documento}${p.cliente.numero_documento}`.toLowerCase();
      const coincideBusqueda =
        !q ||
        nombre.includes(q) ||
        doc.includes(q) ||
        (p.asiento?.numero ?? '').includes(q);
      return coincideEstado && coincideBusqueda;
    });
  }, [manifiesto, filtroEstado, busqueda]);

  const marcarPasajero = useCallback(
    async (pasajero: PasajeroManifiesto, datos: MarcarAbordajeDTO) => {
      if (!viajeId) return;
      setProcesando(true);
      setError(null);
      try {
        await marcarAbordajePasajero(viajeId, pasajero.reserva_cliente_id, datos);
        await recargar();
      } catch (err) {
        setError(mensajeError(err));
      } finally {
        setProcesando(false);
      }
    },
    [viajeId, recargar],
  );

  const marcarLote = useCallback(
    async (estado: MarcarAbordajeDTO['estado'], notas?: string | null) => {
      if (!viajeId || seleccionados.size === 0) return;
      setProcesando(true);
      setError(null);
      try {
        await registrarAbordajeLote(viajeId, {
          pasajeros: [...seleccionados].map((id) => ({
            reserva_cliente_id: Number(id),
            estado,
            notas: notas ?? null,
          })),
        });
        await recargar();
      } catch (err) {
        setError(mensajeError(err));
      } finally {
        setProcesando(false);
      }
    },
    [viajeId, seleccionados, recargar],
  );

  const corregirAbordaje = useCallback(
    async (abordajeId: number, datos: EditarAbordajeDTO) => {
      setProcesando(true);
      setError(null);
      try {
        await editarAbordaje(abordajeId, datos);
        await recargar();
      } catch (err) {
        setError(mensajeError(err));
      } finally {
        setProcesando(false);
      }
    },
    [recargar],
  );

  const revertirAbordaje = useCallback(
    async (abordajeId: number) => {
      setProcesando(true);
      setError(null);
      try {
        await anularAbordaje(abordajeId);
        await recargar();
      } catch (err) {
        setError(mensajeError(err));
      } finally {
        setProcesando(false);
      }
    },
    [recargar],
  );

  return {
    manifiesto,
    pasajerosFiltrados,
    cargando,
    procesando,
    error,
    filtroEstado,
    busqueda,
    seleccionados,
    setFiltroEstado,
    setBusqueda,
    setSeleccionados,
    recargar,
    marcarPasajero,
    marcarLote,
    corregirAbordaje,
    revertirAbordaje,
    setError,
  };
}
