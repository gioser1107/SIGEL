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
