import { useState } from 'react';
import { ModalConfirmacion } from '../../../../../components/admin';
import { eliminarPermiso } from '../../../../../services/seguridad';
import type { Permiso } from '../../../../../types/seguridad';
import { mensajeError } from '../../utils/mensajeError';

interface ModalEliminarPermisoProps {
  abierto: boolean;
  permiso: Permiso | null;
  onCerrar: () => void;
  onEliminadoExito: () => void;
  onError: (mensaje: string) => void;
}

export default function ModalEliminarPermiso({
  abierto,
  permiso,
  onCerrar,
  onEliminadoExito,
  onError,
}: ModalEliminarPermisoProps) {
  const [eliminando, setEliminando] = useState(false);

  async function confirmarEliminar() {
    if (!permiso) return;

    setEliminando(true);
    try {
      await eliminarPermiso(permiso.id);
      onEliminadoExito();
    } catch (err) {
      onError(mensajeError(err));
    } finally {
      setEliminando(false);
    }
  }

  return (
    <ModalConfirmacion
      abierto={abierto}
      titulo="Eliminar permiso"
      mensaje={permiso ? `¿Eliminar el permiso "${permiso.descripcion}"?` : ''}
      textoConfirmar="Eliminar"
      cargando={eliminando}
      onConfirmar={confirmarEliminar}
      onCancelar={onCerrar}
    />
  );
}
