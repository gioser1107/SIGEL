import type { Columna } from '../../../../../components/admin';
import { EtiquetaEstado } from '../../../../../components/admin';
import type { PagoReserva } from '../../../../../types/pagos';
import { ETIQUETA_ESTADO_PAGO, ETIQUETA_TIPO_PAGO } from '../constants';
import { formatearMontoPago } from '../utils/formatoPago';
import { etiquetaMetodoCorta } from '../utils/metodosPagoUi';

const VARIANTE_ESTADO: Record<string, 'advertencia' | 'exito' | 'error'> = {
  en_validacion: 'advertencia',
  aprobado: 'exito',
  rechazado: 'error',
};

export const columnasPagosReserva: Columna<PagoReserva>[] = [
  {
    id: 'fecha',
    encabezado: 'Fecha',
    accessor: (p) => p.fecha_pago,
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
    id: 'tipo',
    encabezado: 'Tipo',
    accessor: (p) => ETIQUETA_TIPO_PAGO[p.tipo],
  },
  {
    id: 'estado',
    encabezado: 'Estado',
    accessor: (p) => (
      <EtiquetaEstado
        etiqueta={ETIQUETA_ESTADO_PAGO[p.estado]}
        variante={VARIANTE_ESTADO[p.estado]}
      />
    ),
  },
  {
    id: 'referencia',
    encabezado: 'Referencia',
    accessor: (p) => p.referencia ?? '—',
  },
];
