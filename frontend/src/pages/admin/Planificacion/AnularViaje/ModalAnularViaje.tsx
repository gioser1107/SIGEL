import { ModalConfirmacion } from '../../../../components/admin';
import type { Viaje } from '../../../../types/viaje';

interface PropsModalAnular {
  abierto: boolean;
  viaje: Viaje | null;
  cargando: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}

export default function ModalAnularViaje({
  abierto,
  viaje,
  cargando,
  onConfirmar,
  onCancelar,
}: PropsModalAnular) {
  return (
    <ModalConfirmacion
      abierto={abierto}
      titulo="Anular viaje"
      mensaje={`¿Confirmas que quieres anular el viaje a "${viaje?.destino_nombre ?? 'este destino'}"? Esta acción no se puede deshacer.`}
      textoConfirmar="Sí, anular"
      cargando={cargando}
      onConfirmar={onConfirmar}
      onCancelar={onCancelar}
    />
  );
}
