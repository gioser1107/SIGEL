import type { MetodoPago } from '../../../../../types/pagos';
import { esCobroEnBolivares, esPagoUsdEquivalenteEur } from './metodosPagoUi';

/** Excluye Cashea y métodos sin código reconocido para el wizard. */
export function filtrarMetodosDisponibles(metodos: MetodoPago[]): MetodoPago[] {
  return metodos.filter((m) => m.codigo !== 'cashea');
}

export function esMonedaBolivares(metodo: MetodoPago | undefined): boolean {
  return esCobroEnBolivares(metodo);
}

export function esMonedaUsd(metodo: MetodoPago | undefined): boolean {
  return esPagoUsdEquivalenteEur(metodo);
}

/** En efectivo USD / Zelle: 1 USD = 1 EUR para fines informativos. */
export function montoUsdEquivalenteEur(montoUsd: number): number {
  return montoUsd;
}

export function calcularSaldoBs(saldoEur: number, tasaValor: number): number {
  if (!tasaValor || tasaValor <= 0) return 0;
  return Math.round(saldoEur * tasaValor * 100) / 100;
}

export function calcularMontoEurInformativo(monto: number, tasaValor: number): number {
  if (!tasaValor || tasaValor <= 0) return 0;
  return Math.round((monto / tasaValor) * 100) / 100;
}

export function formatearMontoInput(valor: string): string {
  const num = Number(valor);
  if (!valor || Number.isNaN(num)) return '0,00';
  return num.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
