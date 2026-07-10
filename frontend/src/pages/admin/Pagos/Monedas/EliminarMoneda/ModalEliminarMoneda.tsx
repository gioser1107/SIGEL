import { useState } from 'react';
import { ModalConfirmacion } from '../../../../../components/admin';
import { eliminarMoneda } from '../../../../../services/monedas';
import type { Moneda } from '../../../../../types/pagos';
import { mensajeError } from '../../utils/mensajeError';

interface ModalEliminarMonedaProps {
  abierto: boolean;
  moneda: Moneda | null;
  onCerrar: () => void;
  onExito: (mensaje: string) => void;
  onError: (mensaje: string) => void;
  onRecargar: () => Promise<void>;
  onCerrarEdicion?: () => void;
}

export default function ModalEliminarMoneda({
  abierto,
  moneda,
  onCerrar,
  onExito,
  onError,
  onRecargar,
  onCerrarEdicion,
}: ModalEliminarMonedaProps) {
  const [eliminando, setEliminando] = useState(false);

  async function confirmar() {
    if (!moneda) return;
    setEliminando(true);
    try {
      await eliminarMoneda(moneda.id);
      onExito('Moneda eliminada.');
      onCerrar();
      onCerrarEdicion?.();
      await onRecargar();
    } catch (err) {
      onError(mensajeError(err, 'monedas'));
    } finally {
      setEliminando(false);
    }
  }

  return (
    <ModalConfirmacion
      abierto={abierto}
      titulo="Eliminar moneda"
      mensaje={moneda ? `¿Eliminar la moneda ${moneda.codigo}? No se puede si está en uso.` : ''}
      textoConfirmar="Eliminar"
      cargando={eliminando}
      onConfirmar={confirmar}
      onCancelar={onCerrar}
    />
  );
}
