import { createContext, useContext } from 'react';
import type { ViajePendiente, ReservaCliente, ViajeAgenda, EstadoReserva } from '../../types/viaje';

export interface ReservasContextValue {
  /** Viaje seleccionado pendiente de pago (null si no hay) */
  viajePendiente: ViajePendiente | null;
  /** Guarda un viaje como pendiente de reserva */
  seleccionarViaje: (viaje: ViajeAgenda, fecha: string) => void;
  /** Limpia el viaje pendiente */
  limpiarViajePendiente: () => void;

  /** Lista de reservas del cliente */
  reservas: ReservaCliente[];
  /** Registra una reserva completada */
  agregarReserva: (reserva: Omit<ReservaCliente, 'id' | 'estado' | 'creadoEn'>) => void;
  /** Actualiza el estado de una reserva (para uso admin) */
  actualizarEstadoReserva: (id: string, estado: EstadoReserva) => void;
}

export const ReservasContext = createContext<ReservasContextValue | null>(null);

export function useReservas(): ReservasContextValue {
  const context = useContext(ReservasContext);
  if (!context) {
    throw new Error('useReservas debe usarse dentro de <ReservasProvider>');
  }
  return context;
}
