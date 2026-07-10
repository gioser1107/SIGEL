import { useCallback, useEffect, useRef, useState } from 'react';
import { listarCiudadesPorEstado, listarEstados } from '../../../../services/ubicaciones';
import type { CiudadUbicacion, EstadoUbicacion } from '../../../../types/cliente';
import { mensajeError } from '../utils/mensajeError';

interface UseUbicacionesClienteOptions {
  panelAbierto: boolean;
  estadoId: string;
  ciudadId: string;
  onError: (mensaje: string) => void;
  onCiudadInvalida: () => void;
}

export default function useUbicacionesCliente({
  panelAbierto,
  estadoId,
  ciudadId,
  onError,
  onCiudadInvalida,
}: UseUbicacionesClienteOptions) {
  const [estados, setEstados] = useState<EstadoUbicacion[]>([]);
  const [ciudades, setCiudades] = useState<CiudadUbicacion[]>([]);
  const [cargandoEstados, setCargandoEstados] = useState(false);
  const [cargandoCiudades, setCargandoCiudades] = useState(false);
  const onErrorRef = useRef(onError);
  const onCiudadInvalidaRef = useRef(onCiudadInvalida);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    onCiudadInvalidaRef.current = onCiudadInvalida;
  }, [onCiudadInvalida]);

  useEffect(() => {
    if (!panelAbierto) return;

    setCargandoEstados(true);
    listarEstados()
      .then(setEstados)
      .catch((err) => onErrorRef.current(mensajeError(err)))
      .finally(() => setCargandoEstados(false));
  }, [panelAbierto]);

  const cargarCiudades = useCallback(
    async (idEstado: string, ciudadPreseleccionada?: string) => {
      if (!idEstado) {
        setCiudades([]);
        return;
      }

      setCargandoCiudades(true);
      try {
        const res = await listarCiudadesPorEstado(Number(idEstado));
        setCiudades(res.ciudades);

        if (
          ciudadPreseleccionada &&
          !res.ciudades.some((c) => String(c.id) === ciudadPreseleccionada)
        ) {
          onCiudadInvalidaRef.current();
        }
      } catch (err) {
        onErrorRef.current(mensajeError(err));
        setCiudades([]);
      } finally {
        setCargandoCiudades(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (panelAbierto && estadoId) {
      void cargarCiudades(estadoId, ciudadId);
      return;
    }
    if (!estadoId) {
      setCiudades((prev) => (prev.length === 0 ? prev : []));
    }
  }, [panelAbierto, estadoId, ciudadId, cargarCiudades]);

  return { estados, ciudades, cargandoEstados, cargandoCiudades };
}
