import { useState } from 'react';
import { ModalConfirmacion } from '../../../../../components/admin';
import { eliminarPagoReserva } from '../../../../../services/pagos';
import type { PagoReserva } from '../../../../../types/pagos';
import { formatearMontoMoneda } from '../utils/formatoPago';
import { mensajeErrorPago } from '../utils/mensajeError';

interface ModalEliminarPagoProps {
  abierto: boolean;
  reservaId: number;
  pago: PagoReserva | null;
  onCerrar: () => void;
  onEliminado: () => void;
  onError: (mensaje: string) => void;
}

export default function ModalEliminarPago({
  abierto,
  reservaId,
  pago,
  onCerrar,
  onEliminado,
  onError,
}: ModalEliminarPagoProps) {
  const [eliminando, setEliminando] = useState(false);

  async function confirmar() {
    if (!pago) return;
    setEliminando(true);
    try {
      await eliminarPagoReserva(reservaId, pago.id);
      onCerrar();
      onEliminado();
    } catch (err) {
      onError(mensajeErrorPago(err));
    } finally {
      setEliminando(false);
    }
  }

  return (
    <ModalConfirmacion
      abierto={abierto}
      titulo="Eliminar pago"
      mensaje={
        pago
          ? `¿Eliminar el pago de ${formatearMontoMoneda(pago.monto, pago.metodo_pago.moneda)}?`
          : ''
      }
      textoConfirmar="Eliminar"
      cargando={eliminando}
      onConfirmar={confirmar}
      onCancelar={onCerrar}
    />
  );
}
