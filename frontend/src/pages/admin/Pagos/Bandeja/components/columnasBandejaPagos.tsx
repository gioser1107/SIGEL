import type { Columna } from '../../../../../components/admin';
import { EtiquetaEstado } from '../../../../../components/admin';
import type { PagoGlobal } from '../../../../../types/pagos';
import { ETIQUETA_ESTADO_PAGO_PORTAL } from '../../../../../types/pagosPortal';
import { codigoReserva } from '../../../../../utils/etiquetasNegocio';
import { formatearEuro } from '../../../../../utils/formatoMoneda';
import { etiquetaMetodoCorta } from '../../../Reservas/Pagos/utils/metodosPagoUi';
import { formatearMontoPago } from '../../../Reservas/Pagos/utils/formatoPago';

const VARIANTE_ESTADO: Record<string, 'advertencia' | 'exito' | 'error'> = {
  en_validacion: 'advertencia',
  aprobado: 'exito',
  rechazado: 'error',
};

function formatearFechaCorta(fecha: string | null | undefined): string {
  if (!fecha) return '—';
  const solo = fecha.slice(0, 10);
  const [anio, mes, dia] = solo.split('-').map(Number);
  if (!anio || !mes || !dia) return fecha;
  return new Date(anio, mes - 1, dia).toLocaleDateString('es-VE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export const columnasBandejaPagos: Columna<PagoGlobal>[] = [
  {
    id: 'reserva',
    encabezado: 'Reserva',
    accessor: (p) => codigoReserva(p.reserva_id),
  },
  {
    id: 'metodo',
    encabezado: 'Método',
    accessor: (p) => etiquetaMetodoCorta(p.metodo_pago),
  },
  {
    id: 'monto',
    encabezado: 'Pagado',
    accessor: (p) => formatearMontoPago(p.monto, p.metodo_pago),
  },
  {
    id: 'monto_eur',
    encabezado: 'Equiv. euros',
    accessor: (p) => (
      <span
        title={
          p.conversion_aproximada
            ? 'Equivalente aproximado: el pago está en dólares y no hay tasa USD registrada.'
            : 'Equivalente en euros para el saldo de la reserva.'
        }
      >
        {formatearEuro(p.monto_eur)}
        {p.conversion_aproximada && (
          <span className="pagos-admin__aprox" aria-label="Conversión aproximada"> *</span>
        )}
      </span>
    ),
  },
  {
    id: 'estado',
    encabezado: 'Estado',
    accessor: (p) => (
      <EtiquetaEstado
        etiqueta={p.estado_etiqueta ?? ETIQUETA_ESTADO_PAGO_PORTAL[p.estado] ?? p.estado}
        variante={VARIANTE_ESTADO[p.estado]}
      />
    ),
  },
  {
    id: 'comprobante',
    encabezado: 'Comprobante',
    accessor: (p) => (p.tiene_comprobante || p.comprobante_url ? 'Sí' : 'No'),
  },
  {
    id: 'fecha',
    encabezado: 'Fecha',
    accessor: (p) => formatearFechaCorta(p.fecha_pago),
  },
  {
    id: 'referencia',
    encabezado: 'Referencia',
    accessor: (p) => p.referencia ?? '—',
  },
];
