import { useState } from 'react';
import { ModalConfirmacion } from '../../../../../components/admin';
import { eliminarRol } from '../../../../../services/seguridad';
import type { Rol } from '../../../../../types/seguridad';
import { mensajeError } from '../../utils/mensajeError';

interface ModalEliminarRolProps {
  abierto: boolean;
  rol: Rol | null;
  onCerrar: () => void;
  onEliminadoExito: () => void;
  onError: (mensaje: string) => void;
}

export default function ModalEliminarRol({
  abierto,
  rol,
  onCerrar,
  onEliminadoExito,
  onError,
}: ModalEliminarRolProps) {
  const [eliminando, setEliminando] = useState(false);

  async function confirmarEliminar() {
    if (!rol) return;

    setEliminando(true);
    try {
      await eliminarRol(rol.id);
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
      titulo="Eliminar rol"
      mensaje={rol ? `¿Eliminar el rol "${rol.nombre}"?` : ''}
      textoConfirmar="Eliminar"
      cargando={eliminando}
      onConfirmar={confirmarEliminar}
      onCancelar={onCerrar}
    />
  );
}
