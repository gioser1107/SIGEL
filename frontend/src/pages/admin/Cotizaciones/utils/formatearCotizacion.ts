import type { Cotizacion } from '../../../../types/cotizacion';

export function etiquetaCliente(c: Cotizacion): string {
  if (c.cliente_razon_social) {
    return `${c.cliente_nombre ?? 'Cliente'} — ${c.cliente_razon_social}`;
  }
  return c.cliente_nombre ?? 'Cliente sin nombre';
}

export function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function filtrarPorPestania(cotizaciones: Cotizacion[], pestania: string): Cotizacion[] {
  if (pestania === 'todos') return cotizaciones;
  if (pestania === 'pendientes') return cotizaciones.filter((c) => c.estado === 'pendiente');
  if (pestania === 'activas') {
    return cotizaciones.filter((c) => ['solicitada', 'pendiente', 'aceptada'].includes(c.estado));
  }
  if (pestania === 'vencidas') return cotizaciones.filter((c) => c.estado === 'vencida');
  return cotizaciones;
}

export function esBloqueada(estado: string): boolean {
  return ['aceptada', 'cancelada'].includes(estado);
}

export function formatearMonedaEur(monto: number): string {
  return `€ ${monto.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
