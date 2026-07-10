import type { Moneda, MetodoPago } from '../../../../../types/pagos';
import { formatearEuro } from '../../../../../utils/formatoMoneda';
import { esPagoUsdEquivalenteEur } from './metodosPagoUi';

export function formatearMontoMoneda(monto: number, moneda?: Moneda | null): string {
  if (!moneda) {
    return monto.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return `${moneda.simbolo} ${monto.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Monto con símbolo correcto según método (p. ej. Efectivo $ aunque el catálogo diga otra moneda). */
export function formatearMontoPago(monto: number, metodo: MetodoPago): string {
  if (esPagoUsdEquivalenteEur(metodo)) {
    return `$ ${monto.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return formatearMontoMoneda(monto, metodo.moneda);
}

export function equivalenciaEurEstimada(monto: number, tasaValor: number): string {
  if (!tasaValor || tasaValor <= 0) return '—';
  return `≈ ${formatearEuro(monto / tasaValor)}`;
}
