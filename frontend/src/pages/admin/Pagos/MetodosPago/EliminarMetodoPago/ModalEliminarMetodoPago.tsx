import { useState } from 'react';
import { ModalConfirmacion } from '../../../../../components/admin';
import { eliminarMetodoPago } from '../../../../../services/metodosPago';
import type { MetodoPago } from '../../../../../types/pagos';
import { mensajeError } from '../../utils/mensajeError';

interface ModalEliminarMetodoPagoProps {
  abierto: boolean;
  metodoPago: MetodoPago | null;
  onCerrar: () => void;
  onExito: (mensaje: string) => void;
  onError: (mensaje: string) => void;
  onRecargar: () => Promise<void>;
  onCerrarEdicion?: () => void;
}

export default function ModalEliminarMetodoPago({
  abierto,
  metodoPago,
  onCerrar,
  onExito,
  onError,
  onRecargar,
  onCerrarEdicion,
}: ModalEliminarMetodoPagoProps) {
  const [eliminando, setEliminando] = useState(false);

  async function confirmar() {
    if (!metodoPago) return;
    setEliminando(true);
    try {
      await eliminarMetodoPago(metodoPago.id);
      onExito('Método de pago eliminado.');
      onCerrar();
      onCerrarEdicion?.();
      await onRecargar();
    } catch (err) {
      onError(mensajeError(err, 'métodos de pago'));
    } finally {
      setEliminando(false);
    }
  }

  return (
    <ModalConfirmacion
      abierto={abierto}
      titulo="Eliminar método de pago"
      mensaje={metodoPago ? `¿Eliminar "${metodoPago.nombre}"? No se puede si tiene pagos registrados.` : ''}
      textoConfirmar="Eliminar"
      cargando={eliminando}
      onConfirmar={confirmar}
      onCancelar={onCerrar}
    />
  );
}
