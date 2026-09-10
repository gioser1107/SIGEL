import type { PestaniaFiltro } from '../../../../components/admin';
import { codigoReserva } from '../../../../utils/etiquetasNegocio';

export interface FiltrosBandeja {
  estado: string;
  reserva_id: string;
  metodo_pago_id: string;
  fecha_desde: string;
  fecha_hasta: string;
}

export const FILTROS_BANDEJA_VACIOS: FiltrosBandeja = {
  estado: 'en_validacion',
  reserva_id: '',
  metodo_pago_id: '',
  fecha_desde: '',
  fecha_hasta: '',
};

export const PESTANIAS_BANDEJA: PestaniaFiltro[] = [
  { id: 'en_validacion', etiqueta: 'Por validar' },
  { id: 'aprobado', etiqueta: 'Aprobados' },
  { id: 'rechazado', etiqueta: 'Rechazados' },
  { id: 'todos', etiqueta: 'Todos' },
];

export function idPestaniaBandeja(estado: string): string {
  return estado || 'todos';
}

export function mensajeVacioBandeja(estado: string): string {
  if (estado === 'en_validacion') return 'No hay pagos esperando validación.';
  if (estado === 'aprobado') return 'No hay pagos aprobados con estos filtros.';
  if (estado === 'rechazado') return 'No hay pagos rechazados con estos filtros.';
  return 'No hay pagos con los filtros seleccionados.';
}

export function resumenListaBandeja(total: number, estado: string): string {
  const n = total.toLocaleString('es-VE');
  const plural = total === 1 ? 'pago' : 'pagos';
  if (estado === 'en_validacion') {
    return total === 0
      ? 'No hay pagos por revisar ahora.'
      : `${n} ${plural} esperando tu revisión.`;
  }
  if (estado === 'aprobado') return `${n} ${plural} ya sumados a su reserva.`;
  if (estado === 'rechazado') return `${n} ${plural} rechazados.`;
  return `${n} ${plural} en total.`;
}

export function extraerIdReserva(valor: string): string {
  return valor.replace(/\D/g, '').slice(0, 10);
}

export function mensajeConfirmarEstado(
  reservaId: number,
  estado: 'aprobado' | 'rechazado',
): { titulo: string; mensaje: string; textoConfirmar: string; variante: 'primario' | 'peligro' } {
  const reserva = codigoReserva(reservaId);
  if (estado === 'aprobado') {
    return {
      titulo: 'Aprobar este pago',
      mensaje: `El monto se sumará al saldo pagado de ${reserva}. ¿Confirmas que el comprobante cuadra?`,
      textoConfirmar: 'Aprobar y sumar',
      variante: 'primario',
    };
  }
  return {
    titulo: 'Rechazar este pago',
    mensaje: `El pago no contará para ${reserva}. El saldo cobrado de la reserva no cambia.`,
    textoConfirmar: 'Rechazar pago',
    variante: 'peligro',
  };
}
