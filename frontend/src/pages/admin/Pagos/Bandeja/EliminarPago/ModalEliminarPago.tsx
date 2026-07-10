import { useState } from 'react';
import { ModalConfirmacion } from '../../../../../components/admin';
import { eliminarPagoReserva } from '../../../../../services/pagos';
import type { PagoGlobal } from '../../../../../types/pagos';
import { mensajeError } from '../../utils/mensajeError';

interface ModalEliminarPagoProps {
  abierto: boolean;
  pago: PagoGlobal | null;
  onCerrar: () => void;
  onExito: (mensaje: string) => void;
  onError: (mensaje: string) => void;
  onRecargar: () => Promise<void>;
}

export default function ModalEliminarPago({
  abierto,
  pago,
  onCerrar,
  onExito,
  onError,
  onRecargar,
}: ModalEliminarPagoProps) {
  const [eliminando, setEliminando] = useState(false);

  async function confirmar() {
    if (!pago) return;
    setEliminando(true);
    try {
      await eliminarPagoReserva(pago.reserva_id, pago.id);
      onExito('Pago eliminado.');
      onCerrar();
      await onRecargar();
    } catch (err) {
      onError(mensajeError(err, 'pagos'));
    } finally {
      setEliminando(false);
    }
  }

  return (
    <ModalConfirmacion
      abierto={abierto}
      titulo="Eliminar pago"
      mensaje={pago ? `¿Eliminar el pago #${pago.id} de la reserva RES-${pago.reserva_id}?` : ''}
      textoConfirmar="Eliminar"
      cargando={eliminando}
      onConfirmar={confirmar}
      onCancelar={onCerrar}
    />
  );
}
