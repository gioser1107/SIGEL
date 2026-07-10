import { useState } from 'react';
import { ModalConfirmacion } from '../../../../../components/admin';
import { eliminarPuntoVenta } from '../../../../../services/puntosVenta';
import type { PuntoVenta } from '../../../../../types/pagos';
import { mensajeError } from '../../utils/mensajeError';

interface ModalEliminarPuntoVentaProps {
  abierto: boolean;
  puntoVenta: PuntoVenta | null;
  onCerrar: () => void;
  onExito: (mensaje: string) => void;
  onError: (mensaje: string) => void;
  onRecargar: () => Promise<void>;
  onCerrarEdicion?: () => void;
}

export default function ModalEliminarPuntoVenta({
  abierto,
  puntoVenta,
  onCerrar,
  onExito,
  onError,
  onRecargar,
  onCerrarEdicion,
}: ModalEliminarPuntoVentaProps) {
  const [eliminando, setEliminando] = useState(false);

  async function confirmar() {
    if (!puntoVenta) return;
    setEliminando(true);
    try {
      await eliminarPuntoVenta(puntoVenta.id);
      onExito('Punto de venta eliminado.');
      onCerrar();
      onCerrarEdicion?.();
      await onRecargar();
    } catch (err) {
      onError(mensajeError(err, 'puntos de venta'));
    } finally {
      setEliminando(false);
    }
  }

  return (
    <ModalConfirmacion
      abierto={abierto}
      titulo="Eliminar punto de venta"
      mensaje={puntoVenta ? `¿Eliminar "${puntoVenta.nombre}"? No se puede si tiene pagos.` : ''}
      textoConfirmar="Eliminar"
      cargando={eliminando}
      onConfirmar={confirmar}
      onCancelar={onCerrar}
    />
  );
}
