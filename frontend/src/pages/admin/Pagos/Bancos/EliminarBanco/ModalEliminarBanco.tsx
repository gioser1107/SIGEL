import { useState } from 'react';
import { ModalConfirmacion } from '../../../../../components/admin';
import { eliminarBanco } from '../../../../../services/bancos';
import type { Banco } from '../../../../../types/pagos';
import { mensajeError } from '../../utils/mensajeError';

interface ModalEliminarBancoProps {
  abierto: boolean;
  banco: Banco | null;
  onCerrar: () => void;
  onExito: (mensaje: string) => void;
  onError: (mensaje: string) => void;
  onRecargar: () => Promise<void>;
  onCerrarEdicion?: () => void;
}

export default function ModalEliminarBanco({
  abierto,
  banco,
  onCerrar,
  onExito,
  onError,
  onRecargar,
  onCerrarEdicion,
}: ModalEliminarBancoProps) {
  const [eliminando, setEliminando] = useState(false);

  async function confirmar() {
    if (!banco) return;
    setEliminando(true);
    try {
      await eliminarBanco(banco.id);
      onExito('Banco eliminado.');
      onCerrar();
      onCerrarEdicion?.();
      await onRecargar();
    } catch (err) {
      onError(mensajeError(err, 'bancos'));
    } finally {
      setEliminando(false);
    }
  }

  return (
    <ModalConfirmacion
      abierto={abierto}
      titulo="Eliminar banco"
      mensaje={banco ? `¿Eliminar "${banco.nombre}"? No se puede si tiene TPV o pagos.` : ''}
      textoConfirmar="Eliminar"
      cargando={eliminando}
      onConfirmar={confirmar}
      onCancelar={onCerrar}
    />
  );
}
