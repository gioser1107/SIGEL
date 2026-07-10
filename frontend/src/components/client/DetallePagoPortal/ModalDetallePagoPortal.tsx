import { useEffect } from 'react';
import ContenidoDetallePagoPortal from './ContenidoDetallePagoPortal';
import { useDetallePagoPortal } from '../../../hooks/useDetallePagoPortal';
import '../../../pages/client/MisSolicitudes/MisSolicitudes.css';
import './ContenidoDetallePagoPortal.css';

interface ModalDetallePagoPortalProps {
  abierto: boolean;
  reservaId: number | null;
  pagoId: number | null;
  onCerrar: () => void;
}

export default function ModalDetallePagoPortal({
  abierto,
  reservaId,
  pagoId,
  onCerrar,
}: ModalDetallePagoPortalProps) {
  const { detalle, cargando, error, cargar, limpiar } = useDetallePagoPortal();

  useEffect(() => {
    if (abierto && reservaId && pagoId) {
      void cargar(reservaId, pagoId);
    } else {
      limpiar();
    }
  }, [abierto, reservaId, pagoId, cargar, limpiar]);

  if (!abierto) return null;

  return (
    <div className="modal-cotizacion" onClick={onCerrar}>
      <div className="modal-cotizacion__card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-cotizacion__header">
          <div className="modal-cotizacion__header-text">
            <span className="modal-cotizacion__tag">Detalle de pago</span>
            <h2 className="modal-cotizacion__title">Pago reportado</h2>
          </div>
          <button type="button" className="modal-cotizacion__cerrar" onClick={onCerrar} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className="modal-cotizacion__body">
          {cargando && <p>Cargando detalle…</p>}
          {error && <p role="alert">{error}</p>}
          {detalle && <ContenidoDetallePagoPortal detalle={detalle} />}
        </div>

        <div className="modal-cotizacion__footer">
          <button type="button" className="modal-cotizacion__btn-cancelar" onClick={onCerrar}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
