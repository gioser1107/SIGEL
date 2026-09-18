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

export function formatearCantidad(valor: number): string {
  if (!Number.isFinite(valor)) return '0';
  if (Number.isInteger(valor)) return String(valor);
  return valor.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function etiquetaUnidadCorta(unidad: string): string {
  const etiquetas: Record<string, string> = {
    personas: 'pers.',
    noches: 'noches',
    servicios: 'serv.',
    unidades: 'und.',
  };
  return etiquetas[unidad] ?? unidad;
}

export function importeDesdeCantidadYPrecio(cantidad: string | number, precio: string | number): number {
  const cant = Number(cantidad);
  const unitario = Number(precio);
  if (!Number.isFinite(cant) || !Number.isFinite(unitario)) return 0;
  return Math.round(cant * unitario * 100) / 100;
}
