import { useState, useEffect, type ReactNode } from 'react';
import type { ViajePendiente, ReservaCliente, ViajeAgenda, EstadoReserva } from '../../types/viaje';
import { ReservasContext } from './ReservasContext';

const STORAGE_KEY_PENDIENTE = 'viaje_pendiente_reserva';
const STORAGE_KEY_RESERVAS = 'mis_reservas';

export function ReservasProvider({ children }: { children: ReactNode }) {
  const [viajePendiente, setViajePendiente] = useState<ViajePendiente | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PENDIENTE);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [reservas, setReservas] = useState<ReservaCliente[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RESERVAS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Persistir viaje pendiente
  useEffect(() => {
    if (viajePendiente) {
      localStorage.setItem(STORAGE_KEY_PENDIENTE, JSON.stringify(viajePendiente));
    } else {
      localStorage.removeItem(STORAGE_KEY_PENDIENTE);
    }
  }, [viajePendiente]);

  // Persistir reservas
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_RESERVAS, JSON.stringify(reservas));
  }, [reservas]);

  const seleccionarViaje = (viaje: ViajeAgenda, fecha: string) => {
    setViajePendiente({ viaje, fecha });
  };

  const limpiarViajePendiente = () => {
    setViajePendiente(null);
  };

  const agregarReserva = (datos: Omit<ReservaCliente, 'id' | 'estado' | 'creadoEn'>) => {
    const nuevaReserva: ReservaCliente = {
      ...datos,
      id: `RES-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      estado: 'pendiente',
      creadoEn: new Date().toISOString(),
    };
    setReservas((prev) => [nuevaReserva, ...prev]);
  };

  const actualizarEstadoReserva = (id: string, estado: EstadoReserva) => {
    setReservas((prev) =>
      prev.map((r) => (r.id === id ? { ...r, estado } : r))
    );
  };

  return (
    <ReservasContext.Provider
      value={{
        viajePendiente,
        seleccionarViaje,
        limpiarViajePendiente,
        reservas,
        agregarReserva,
        actualizarEstadoReserva,
      }}
    >
      {children}
    </ReservasContext.Provider>
  );
}
