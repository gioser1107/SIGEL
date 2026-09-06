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
    encabezado: 'Monto',
    accessor: (p) => formatearMontoPago(p.monto, p.metodo_pago),
  },
  {
    id: 'monto_eur',
    encabezado: 'Monto EUR',
    accessor: (p) => (
      <span title={p.conversion_aproximada ? 'Conversión aproximada' : undefined}>
        {formatearEuro(p.monto_eur)}
        {p.conversion_aproximada && ' *'}
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
  { id: 'fecha', encabezado: 'Fecha', accessor: (p) => p.fecha_pago },
  {
    id: 'referencia',
    encabezado: 'Referencia',
    accessor: (p) => p.referencia ?? '—',
  },
];
