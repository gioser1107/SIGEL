import { useState } from 'react';
import { ModalConfirmacion } from '../../../../../components/admin';
import { eliminarUsuario } from '../../../../../services/seguridad';
import type { UsuarioSistema } from '../../../../../types/seguridad';
import { nombreCompleto } from '../../../../../utils/nombrePersona';
import { mensajeError } from '../../utils/mensajeError';

interface ModalEliminarUsuarioProps {
  abierto: boolean;
  usuario: UsuarioSistema | null;
  onCerrar: () => void;
  onEliminadoExito: () => void;
  onError: (mensaje: string) => void;
}

export default function ModalEliminarUsuario({
  abierto,
  usuario,
  onCerrar,
  onEliminadoExito,
  onError,
}: ModalEliminarUsuarioProps) {
  const [eliminando, setEliminando] = useState(false);

  async function confirmarEliminar() {
    if (!usuario) return;

    setEliminando(true);
    try {
      await eliminarUsuario(usuario.id);
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
      titulo="Eliminar usuario"
      mensaje={
        usuario
          ? `¿Desactivar la cuenta de ${nombreCompleto(usuario.nombre, usuario.apellido)}?`
          : ''
      }
      textoConfirmar="Eliminar"
      cargando={eliminando}
      onConfirmar={confirmarEliminar}
      onCancelar={onCerrar}
    />
  );
}
