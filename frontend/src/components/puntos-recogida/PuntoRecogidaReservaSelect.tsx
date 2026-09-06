import { useEffect, useMemo, useState } from 'react';
import { listarMisPuntosRecogida } from '../../services/puntos_recogida';
import { obtenerParadasPublicas } from '../../services/viajes';
import type { PuntoRecogida } from '../../types/puntoRecogida';
import type { Parada } from '../../types/viaje';
import { etiquetaPunto } from './utils';
import './puntos-recogida.css';

interface PuntoRecogidaReservaSelectProps {
  viajeId: number;
  value: number | null;
  onChange: (puntoRecogidaId: number | null) => void;
  onError?: (msg: string) => void;
  requerido?: boolean;
}

export default function PuntoRecogidaReservaSelect({
  viajeId,
  value,
  onChange,
  onError,
  requerido = true,
}: PuntoRecogidaReservaSelectProps) {
  const [paradas, setParadas] = useState<Parada[]>([]);
  const [misPuntos, setMisPuntos] = useState<PuntoRecogida[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarTodasParadas, setMostrarTodasParadas] = useState(false);

  useEffect(() => {
    if (!viajeId) return;
    setCargando(true);
    setParadas([]);
    setMisPuntos([]);

    Promise.allSettled([obtenerParadasPublicas(viajeId), listarMisPuntosRecogida()])
      .then(([paradasResult, misPuntosResult]) => {
        if (paradasResult.status === 'fulfilled') {
          setParadas(paradasResult.value);
        } else {
          onError?.(
            paradasResult.reason instanceof Error
              ? paradasResult.reason.message
              : 'Error al cargar paradas del viaje',
          );
        }

        if (misPuntosResult.status === 'fulfilled') {
          setMisPuntos(misPuntosResult.value);
        }
      })
      .finally(() => setCargando(false));
  }, [viajeId, onError]);

  const idsParadasViaje = useMemo(
    () => new Set(paradas.map((p) => p.punto_recogida_id)),
    [paradas],
  );

  const misPuntosEnRuta = useMemo(
    () => misPuntos.filter((p) => idsParadasViaje.has(p.id)),
    [misPuntos, idsParadasViaje],
  );

  const predeterminadoEnRuta = misPuntosEnRuta.find((p) => p.es_predeterminado);

  useEffect(() => {
    if (value != null || cargando || paradas.length === 0) return;
    if (predeterminadoEnRuta) {
      onChange(predeterminadoEnRuta.id);
      return;
    }
    if (misPuntosEnRuta.length === 1) {
      onChange(misPuntosEnRuta[0].id);
    }
  }, [value, cargando, paradas.length, predeterminadoEnRuta, misPuntosEnRuta, onChange]);

  const opciones = useMemo(() => {
    if (mostrarTodasParadas || misPuntosEnRuta.length === 0) {
      return paradas.map((p) => ({
        id: p.punto_recogida_id,
        label: p.punto_nombre ?? 'Domicilio de recogida',
        esMio: misPuntos.some((mp) => mp.id === p.punto_recogida_id),
      }));
    }
    return misPuntosEnRuta.map((p) => ({
      id: p.id,
      label: etiquetaPunto(p),
      esMio: true,
    }));
  }, [mostrarTodasParadas, misPuntosEnRuta, paradas, misPuntos]);

  if (cargando) {
    return <p className="pr-reserva-select__hint">Cargando paradas del viaje…</p>;
  }

  if (paradas.length === 0) {
    return (
      <p className="pr-reserva-select__hint">
        Este viaje no tiene paradas configuradas. Contacta a la agencia.
      </p>
    );
  }

  return (
    <div className="pr-reserva-select">
      <label className="pr-reserva-select__label" htmlFor="punto-recogida-reserva">
        Punto de recogida {requerido && <span className="pr-reserva-select__req">*</span>}
      </label>

      {predeterminadoEnRuta && !mostrarTodasParadas && value === predeterminadoEnRuta.id && (
        <p className="pr-reserva-select__hint">
          Se preseleccionó tu punto predeterminado en la ruta de este viaje.
        </p>
      )}

      {misPuntosEnRuta.length === 0 && (
        <p className="pr-reserva-select__aviso">
          Ninguno de tus puntos guardados está en la ruta. Elige una parada del viaje.
        </p>
      )}

      <select
        id="punto-recogida-reserva"
        className="pr-reserva-select__input"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      >
        <option value="">— Selecciona parada —</option>
        {opciones.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
            {o.esMio ? ' (tu punto)' : ''}
          </option>
        ))}
      </select>

      {misPuntosEnRuta.length > 0 && misPuntosEnRuta.length < paradas.length && (
        <button
          type="button"
          className="pr-reserva-select__link"
          onClick={() => setMostrarTodasParadas((v) => !v)}
        >
          {mostrarTodasParadas ? 'Ver solo mis puntos en la ruta' : 'Elegir otra parada del viaje'}
        </button>
      )}
    </div>
  );
}
