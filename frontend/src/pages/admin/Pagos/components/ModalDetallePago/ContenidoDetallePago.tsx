import { EtiquetaEstado } from '../../../../../components/admin';
import type { PagoGlobal, PagoReserva } from '../../../../../types/pagos';
import { ETIQUETA_ESTADO_PAGO, ETIQUETA_TIPO_PAGO } from '../../../Reservas/Pagos/constants';
import { formatearMontoPago } from '../../../Reservas/Pagos/utils/formatoPago';
import { etiquetaMetodoCorta } from '../../../Reservas/Pagos/utils/metodosPagoUi';
import { formatearEuro } from '../../../../../utils/formatoMoneda';
import { resolverUrlArchivo } from '../../../../../utils/resolverUrlArchivo';
import './ModalDetallePago.css';

interface ContenidoDetallePagoProps {
  pago: PagoReserva | PagoGlobal;
}

const VARIANTE_ESTADO: Record<string, 'advertencia' | 'exito' | 'error'> = {
  en_validacion: 'advertencia',
  aprobado: 'exito',
  rechazado: 'error',
};

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

function esPagoGlobal(pago: PagoReserva | PagoGlobal): pago is PagoGlobal {
  return 'conversion_aproximada' in pago;
}

export default function ContenidoDetallePago({ pago }: ContenidoDetallePagoProps) {
  const tieneComprobante = pago.tiene_comprobante ?? Boolean(pago.comprobante_url);
  const comprobanteSrc =
    tieneComprobante && pago.comprobante_url ? resolverUrlArchivo(pago.comprobante_url) : '';
  const conversionAproximada = esPagoGlobal(pago) && pago.conversion_aproximada;
  const etiquetaEstado = pago.estado_etiqueta ?? ETIQUETA_ESTADO_PAGO[pago.estado];

  return (
    <div className="detalle-pago-admin">
      <div className="detalle-pago-admin__estado">
        <EtiquetaEstado
          etiqueta={etiquetaEstado}
          variante={VARIANTE_ESTADO[pago.estado]}
        />
      </div>

      <dl className="detalle-pago-admin__lista">
        <div>
          <dt>Reserva</dt>
          <dd>RES-{pago.reserva_id}</dd>
        </div>
        <div>
          <dt>Método</dt>
          <dd>{etiquetaMetodoCorta(pago.metodo_pago)}</dd>
        </div>
        <div>
          <dt>Monto</dt>
          <dd>{formatearMontoPago(pago.monto, pago.metodo_pago)}</dd>
        </div>
        <div>
          <dt>Equivalente EUR</dt>
          <dd>
            {pago.monto_eur != null ? formatearEuro(pago.monto_eur) : '—'}
            {conversionAproximada && ' *'}
          </dd>
        </div>
        <div>
          <dt>Tipo</dt>
          <dd>{ETIQUETA_TIPO_PAGO[pago.tipo]}</dd>
        </div>
        <div>
          <dt>Referencia</dt>
          <dd>{pago.referencia ?? '—'}</dd>
        </div>
        <div>
          <dt>Banco origen</dt>
          <dd>{pago.banco_origen?.nombre ?? '—'}</dd>
        </div>
        <div>
          <dt>Banco destino</dt>
          <dd>{pago.banco_destino?.nombre ?? '—'}</dd>
        </div>
        {pago.punto_venta && (
          <div>
            <dt>Punto de venta</dt>
            <dd>{pago.punto_venta.nombre}</dd>
          </div>
        )}
        <div>
          <dt>Teléfono origen</dt>
          <dd>{pago.telefono_origen ?? '—'}</dd>
        </div>
        {pago.correo_origen && (
          <div>
            <dt>Correo origen</dt>
            <dd>{pago.correo_origen}</dd>
          </div>
        )}
        <div>
          <dt>Fecha de pago</dt>
          <dd>{formatearFechaHora(pago.fecha_pago)}</dd>
        </div>
        {pago.validado_en && (
          <div>
            <dt>Validado el</dt>
            <dd>{formatearFechaHora(pago.validado_en)}</dd>
          </div>
        )}
        {pago.notas && (
          <div className="detalle-pago-admin__fila-completa">
            <dt>Notas</dt>
            <dd>{pago.notas}</dd>
          </div>
        )}
      </dl>

      {comprobanteSrc ? (
        <div className="detalle-pago-admin__comprobante">
          <p className="detalle-pago-admin__comprobante-titulo">Captura del comprobante</p>
          <a href={comprobanteSrc} target="_blank" rel="noopener noreferrer">
            <img src={comprobanteSrc} alt="Comprobante de pago" />
          </a>
        </div>
      ) : (
        <p className="detalle-pago-admin__sin-comprobante">Sin comprobante adjunto.</p>
      )}
    </div>
  );
}
