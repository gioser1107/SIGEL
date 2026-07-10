import { useState } from 'react';
import { ModalConfirmacion } from '../../../../components/admin';
import { desactivarCliente } from '../../../../services/clientes';
import type { Cliente } from '../../../../types/cliente';
import { nombreCompleto } from '../../../../utils/nombrePersona';
import { mensajeError } from '../utils/mensajeError';

interface ModalDesactivarClienteProps {
  abierto: boolean;
  cliente: Cliente | null;
  onCerrar: () => void;
  onDesactivadoExito: () => void;
  onError: (mensaje: string) => void;
}

export default function ModalDesactivarCliente({
  abierto,
  cliente,
  onCerrar,
  onDesactivadoExito,
  onError,
}: ModalDesactivarClienteProps) {
  const [desactivando, setDesactivando] = useState(false);

  async function confirmarDesactivar() {
    if (!cliente) return;

    setDesactivando(true);
    try {
      await desactivarCliente(cliente.cliente_id);
      onDesactivadoExito();
    } catch (err) {
      onError(mensajeError(err));
    } finally {
      setDesactivando(false);
    }
  }

  return (
    <ModalConfirmacion
      abierto={abierto}
      titulo="Desactivar cliente"
      mensaje={
        cliente
          ? `¿Desactivar la ficha de ${nombreCompleto(cliente.nombre, cliente.apellido)}? El registro no se elimina del sistema.`
          : ''
      }
      textoConfirmar="Desactivar"
      cargando={desactivando}
      onConfirmar={confirmarDesactivar}
      onCancelar={onCerrar}
    />
  );
}
