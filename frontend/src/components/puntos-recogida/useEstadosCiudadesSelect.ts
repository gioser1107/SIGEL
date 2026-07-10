import { useCallback, useEffect, useState } from 'react';
import { listarCiudadesPorEstado, listarEstados } from '../../services/ubicaciones';
import type { CiudadUbicacion, EstadoUbicacion } from '../../types/cliente';

export function useEstadosCiudadesSelect() {
  const [estadoId, setEstadoId] = useState('');
  const [ciudadId, setCiudadId] = useState('');
  const [estados, setEstados] = useState<EstadoUbicacion[]>([]);
  const [ciudades, setCiudades] = useState<CiudadUbicacion[]>([]);
  const [cargandoEstados, setCargandoEstados] = useState(true);
  const [cargandoCiudades, setCargandoCiudades] = useState(false);

  useEffect(() => {
    setCargandoEstados(true);
    listarEstados()
      .then(setEstados)
      .catch(() => setEstados([]))
      .finally(() => setCargandoEstados(false));
  }, []);

  const cargarCiudades = useCallback(async (id: string) => {
    if (!id) {
      setCiudades([]);
      return [];
    }
    setCargandoCiudades(true);
    try {
      const res = await listarCiudadesPorEstado(Number(id));
      setCiudades(res.ciudades);
      return res.ciudades;
    } catch {
      setCiudades([]);
      return [];
    } finally {
      setCargandoCiudades(false);
    }
  }, []);

  const limpiarUbicacion = useCallback(() => {
    setEstadoId('');
    setCiudadId('');
    setCiudades([]);
  }, []);

  const initDesdeNombres = useCallback(
    async (estadoNombre?: string | null, ciudadNombre?: string | null) => {
      if (!estadoNombre) {
        limpiarUbicacion();
        return;
      }
      const listaEstados = estados.length ? estados : await listarEstados().catch(() => []);
      if (!estados.length && listaEstados.length) setEstados(listaEstados);

      const estado = listaEstados.find(
        (e) => e.nombre.toLowerCase() === estadoNombre.toLowerCase(),
      );
      if (!estado) {
        limpiarUbicacion();
        return;
      }

      setEstadoId(String(estado.id));
      const listaCiudades = await cargarCiudades(String(estado.id));
      if (ciudadNombre) {
        const ciudad = listaCiudades.find(
          (c) => c.nombre.toLowerCase() === ciudadNombre.toLowerCase(),
        );
        setCiudadId(ciudad ? String(ciudad.id) : '');
      } else {
        setCiudadId('');
      }
    },
    [estados, cargarCiudades, limpiarUbicacion],
  );

  const nombresSeleccionados = useCallback(() => {
    const estadoNombre = estados.find((e) => String(e.id) === estadoId)?.nombre;
    const ciudadNombre = ciudades.find((c) => String(c.id) === ciudadId)?.nombre;
    return { estado: estadoNombre, ciudad: ciudadNombre };
  }, [estados, ciudades, estadoId, ciudadId]);

  return {
    estadoId,
    setEstadoId,
    ciudadId,
    setCiudadId,
    estados,
    ciudades,
    cargandoEstados,
    cargandoCiudades,
    cargarCiudades,
    limpiarUbicacion,
    initDesdeNombres,
    nombresSeleccionados,
  };
}
