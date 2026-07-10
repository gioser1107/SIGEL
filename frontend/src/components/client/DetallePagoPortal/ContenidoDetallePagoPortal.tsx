import type { PagoPortalDetalle } from '../../../types/pagosPortal';
import { formatearMontoPortalPago } from '../../../services/pagosPortal';
import { formatearEuro } from '../../../utils/formatoMoneda';
import { resolverUrlArchivo } from '../../../utils/resolverUrlArchivo';
import './ContenidoDetallePagoPortal.css';

interface ContenidoDetallePagoPortalProps {
  detalle: PagoPortalDetalle;
}

function formatearFechaHora(fecha: string | null | undefined): string {
  if (!fecha) return '—';
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return fecha;
  return d.toLocaleString('es-VE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Contenido de detalle de pago portal (para modal o página existente). */
export default function ContenidoDetallePagoPortal({ detalle }: ContenidoDetallePagoPortalProps) {
  const comprobanteSrc =
    detalle.tiene_comprobante && detalle.comprobante_url
      ? resolverUrlArchivo(detalle.comprobante_url)
      : '';

  return (
    <div className="detalle-pago-portal">
      <dl className="detalle-pago-portal__lista">
        <div>
          <dt>Estado</dt>
          <dd>{detalle.estado_etiqueta}</dd>
        </div>
        <div>
          <dt>Monto</dt>
          <dd>{formatearMontoPortalPago(detalle)}</dd>
        </div>
        <div>
          <dt>Equivalente EUR</dt>
          <dd>{formatearEuro(detalle.monto_eur)}</dd>
        </div>
        <div>
          <dt>Referencia</dt>
          <dd>{detalle.referencia ?? '—'}</dd>
        </div>
        <div>
          <dt>Banco origen</dt>
          <dd>{detalle.banco_origen?.nombre ?? '—'}</dd>
        </div>
        <div>
          <dt>Banco destino</dt>
          <dd>{detalle.banco_destino?.nombre ?? '—'}</dd>
        </div>
        <div>
          <dt>Teléfono</dt>
          <dd>{detalle.telefono_origen ?? '—'}</dd>
        </div>
        <div>
          <dt>Fecha de pago</dt>
          <dd>{formatearFechaHora(detalle.fecha_pago)}</dd>
        </div>
        {detalle.validado_en && (
          <div>
            <dt>Validado el</dt>
            <dd>{formatearFechaHora(detalle.validado_en)}</dd>
          </div>
        )}
      </dl>

      {comprobanteSrc && (
        <div className="detalle-pago-portal__comprobante">
          <img src={comprobanteSrc} alt="Comprobante de pago" />
        </div>
      )}
    </div>
  );
}
