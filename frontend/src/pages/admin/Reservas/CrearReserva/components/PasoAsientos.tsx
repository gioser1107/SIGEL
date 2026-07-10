import { useState, useEffect } from 'react';
import MapaAsientos from '../../../../../components/client/MapaAsientos/MapaAsientos';
import { obtenerAsientosDisponibles } from '../../../../../services/viajes';
import type { AsientoViaje } from '../../../../../types/viaje';

interface Props {
  viajeId: number;
  maxAsientos: number;
  asientosSeleccionados: number[];
  setAsientosSeleccionados: (asientos: number[]) => void;
  onSiguiente: (asientos: number[]) => void | Promise<void>;
  onAtras: () => void;
  guardando?: boolean;
}

export default function PasoAsientos({
  viajeId,
  maxAsientos,
  setAsientosSeleccionados,
  onSiguiente,
  onAtras,
  guardando = false,
}: Props) {
  const [asientosViaje, setAsientosViaje] = useState<AsientoViaje[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const bloqueado = guardando || confirmando;

  useEffect(() => {
    let activo = true;

    async function cargar() {
      if (!viajeId) return;
      setCargando(true);
      setError(null);
      try {
        const respuesta = await obtenerAsientosDisponibles(viajeId);
        if (activo) {
          setAsientosViaje(respuesta.asientos);
        }
      } catch (err) {
        if (activo) {
          const msg = err instanceof Error ? err.message : 'Error al cargar asientos';
          setError(msg);
        }
      } finally {
        if (activo) setCargando(false);
      }
    }

    cargar();
    return () => { activo = false; };
  }, [viajeId]);

  if (cargando) {
    return (
      <div className="step-content" style={{ textAlign: 'center', padding: '3rem' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>Cargando mapa de asientos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="step-content" style={{ textAlign: 'center', padding: '3rem' }}>
        <p style={{ color: 'var(--color-error, red)' }}>{error}</p>
      </div>
    );
  }

  if (asientosViaje.length === 0) {
    return (
      <div className="step-content" style={{ textAlign: 'center', padding: '3rem' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>
          No hay asientos registrados para la unidad asignada a este viaje.
          Registra los asientos en el módulo de flota y transporte primero.
        </p>
      </div>
    );
  }

  return (
    <div className="step-content">
      <h3>Seleccionar Asientos</h3>
      <p style={{ marginBottom: '1rem', color: 'var(--color-text-muted)' }}>
        Debe seleccionar exactamente <strong>{maxAsientos}</strong> asiento(s) correspondiente(s) al número de pasajeros que ocupan puesto.
      </p>

      {bloqueado && (
        <p style={{ marginBottom: '1rem', color: 'var(--color-text-muted)' }}>
          Creando reserva, por favor espera…
        </p>
      )}

      <MapaAsientos
        esAdmin={true}
        cantidadPuestos={maxAsientos}
        asientos={asientosViaje}
        alConfirmar={async (asientos) => {
          if (bloqueado) return;
          setConfirmando(true);
          try {
            setAsientosSeleccionados(asientos);
            await onSiguiente(asientos);
          } finally {
            setConfirmando(false);
          }
        }}
        alRegresar={onAtras}
      />
    </div>
  );
}
