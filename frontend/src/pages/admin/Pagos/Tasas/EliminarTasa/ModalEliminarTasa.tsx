import { useState } from 'react';
import { ModalConfirmacion } from '../../../../../components/admin';
import { eliminarTasa } from '../../../../../services/tasas';
import type { TasaCambio } from '../../../../../types/pagos';
import { mensajeError } from '../../utils/mensajeError';

interface ModalEliminarTasaProps {
  abierto: boolean;
  tasa: TasaCambio | null;
  onCerrar: () => void;
  onExito: (mensaje: string) => void;
  onError: (mensaje: string) => void;
  onRecargar: () => Promise<void>;
  onCerrarEdicion?: () => void;
}

export default function ModalEliminarTasa({
  abierto,
  tasa,
  onCerrar,
  onExito,
  onError,
  onRecargar,
  onCerrarEdicion,
}: ModalEliminarTasaProps) {
  const [eliminando, setEliminando] = useState(false);

  async function confirmar() {
    if (!tasa) return;
    setEliminando(true);
    try {
      await eliminarTasa(tasa.id);
      onExito('Tasa eliminada.');
      onCerrar();
      onCerrarEdicion?.();
      await onRecargar();
    } catch (err) {
      onError(mensajeError(err, 'tasas'));
    } finally {
      setEliminando(false);
    }
  }

  return (
    <ModalConfirmacion
      abierto={abierto}
      titulo="Eliminar tasa"
      mensaje={tasa ? `¿Eliminar la tasa del ${tasa.fecha}? No se puede si está en un pago.` : ''}
      textoConfirmar="Eliminar"
      cargando={eliminando}
      onConfirmar={confirmar}
      onCancelar={onCerrar}
    />
  );
}
