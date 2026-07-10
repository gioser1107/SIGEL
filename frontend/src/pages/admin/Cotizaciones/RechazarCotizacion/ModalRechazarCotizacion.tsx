import { ModalConfirmacion } from '../../../../components/admin';
import type { Cotizacion } from '../../../../types/cotizacion';

interface PropsModalRechazar {
  abierto: boolean;
  cotizacion: Cotizacion | null;
  cargando: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}

// Modal de confirmación para rechazar y eliminar una cotización
export default function ModalRechazarCotizacion({
  abierto,
  cotizacion,
  cargando,
  onConfirmar,
  onCancelar,
}: PropsModalRechazar) {
  return (
    <ModalConfirmacion
      abierto={abierto}
      titulo="Rechazar cotización"
      mensaje={`¿Confirmas que quieres rechazar y cancelar la cotización de "${cotizacion?.cliente_nombre ?? 'este cliente'}"? Esta acción no se puede deshacer.`}
      textoConfirmar="Sí, rechazar"
      cargando={cargando}
      onConfirmar={onConfirmar}
      onCancelar={onCancelar}
    />
  );
}
