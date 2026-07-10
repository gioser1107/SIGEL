import { ModalConfirmacion } from '../../../../components/admin';
import type { Destino } from '../../../../types/destino';

interface PropsModalAnular {
  abierto: boolean;
  destino: Destino | null;
  cargando: boolean;
  error?: string | null;
  onConfirmar: () => void;
  onCancelar: () => void;
}

export default function ModalAnularDestino({
  abierto,
  destino,
  cargando,
  error,
  onConfirmar,
  onCancelar,
}: PropsModalAnular) {
  return (
    <ModalConfirmacion
      abierto={abierto}
      titulo="Anular destino"
      mensaje={
        destino
          ? `¿Confirmas que quieres anular "${destino.nombre}"? Pasará a la pestaña «Anulados» (borrado lógico).`
          : ''
      }
      error={error}
      textoConfirmar="Sí, anular"
      cargando={cargando}
      onConfirmar={onConfirmar}
      onCancelar={onCancelar}
    />
  );
}
