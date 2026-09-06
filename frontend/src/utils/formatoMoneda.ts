/** Formatea un monto en euros para mostrar en UI (es-ES). */
export function formatearEuro(monto: number): string {
  return `€ ${monto.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Formatea un monto en bolívares para mostrar en UI (es-VE). */
export function formatearBs(monto: number): string {
  return `Bs. ${monto.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Formatea euros compactos sin decimales (KPIs, badges). */
export function formatearEuroCompacto(monto: number): string {
  return `€ ${monto.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/** No pintar 0 en el input: en el teléfono escribir 45 con un 0 delante termina en 450. */
export function textoMontoVisible(valor: number | string | null | undefined): string {
  if (valor === null || valor === undefined || valor === '') return '';
  if (typeof valor === 'number') {
    if (!Number.isFinite(valor) || valor === 0) return '';
    return String(valor);
  }
  const recorte = valor.trim();
  if (recorte === '' || recorte === '0' || recorte === '0.0' || recorte === '0.00') return '';
  return valor;
}

export function numeroDesdeMonto(bruto: string): number {
  const recorte = bruto.trim().replace(',', '.');
  if (recorte === '') return 0;
  const n = Number(recorte);
  return Number.isFinite(n) ? n : 0;
}
