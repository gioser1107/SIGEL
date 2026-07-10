import { ModalConfirmacion } from '../../../../components/admin';
import type { ReservaEnriquecida } from '../../../../types/reservas';
import { eliminarReserva } from '../../../../services/reservas';
import { useState } from 'react';

interface Props {
  abierto: boolean;
  reserva: ReservaEnriquecida | null;
  onCerrar: () => void;
  onEliminadoExito: () => void;
  onError: (msg: string) => void;
}

export default function ModalEliminarReserva({
  abierto,
  reserva,
  onCerrar,
  onEliminadoExito,
  onError,
}: Props) {
  const [eliminando, setEliminando] = useState(false);

  const confirmarEliminar = async () => {
    if (!reserva) return;
    setEliminando(true);
    try {
      await eliminarReserva(reserva.id);
      onEliminadoExito();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Error al eliminar la reserva');
    } finally {
      setEliminando(false);
    }
  };

  return (
    <ModalConfirmacion
      abierto={abierto}
      titulo="Eliminar Reserva"
      mensaje={
        reserva
          ? `¿Estás seguro de eliminar la reserva RES-${reserva.id}? Esta acción marcará la reserva y sus pasajeros como eliminados en el sistema.`
          : ''
      }
      textoConfirmar="Eliminar"
      cargando={eliminando}
      onConfirmar={confirmarEliminar}
      onCancelar={onCerrar}
    />
  );
}
