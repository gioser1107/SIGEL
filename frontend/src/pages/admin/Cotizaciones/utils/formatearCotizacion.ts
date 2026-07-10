import type { Cotizacion } from '../../../../types/cotizacion';

// Arma la etiqueta visible del cliente incluyendo razón social si existe
export function etiquetaCliente(c: Cotizacion): string {
  if (c.cliente_razon_social) {
    return `${c.cliente_nombre ?? 'Cliente'} — ${c.cliente_razon_social}`;
  }
  return c.cliente_nombre ?? `Cliente #${c.cliente_id}`;
}

// Convierte la fecha ISO a formato legible dd/mm/aaaa (zona VE)
export function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// Filtra cotizaciones según la pestaña activa
export function filtrarPorTab(cotizaciones: Cotizacion[], tab: string): Cotizacion[] {
  if (tab === 'todos') return cotizaciones;
  if (tab === 'pendientes') return cotizaciones.filter((c) => c.estado === 'pendiente');
  if (tab === 'activas') {
    return cotizaciones.filter((c) => ['solicitada', 'pendiente', 'aceptada'].includes(c.estado));
  }
  if (tab === 'vencidas') return cotizaciones.filter((c) => c.estado === 'vencida');
  return cotizaciones;
}

// Indica si la cotización está bloqueada para edición (aceptada o cancelada)
export function esBloqueada(estado: string): boolean {
  return ['aceptada', 'cancelada'].includes(estado);
}
