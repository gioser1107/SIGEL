import type { DomicilioManifiesto } from '../../../../types/abordaje';

export function formatearFechaViaje(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-VE', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatearDocumento(tipo: string, numero: string): string {
  return `${tipo}-${numero}`.trim();
}

export function formatearDomicilio(domicilio: DomicilioManifiesto | null | undefined): string {
  if (!domicilio) return '—';
  const partes = [
    domicilio.nombre,
    domicilio.direccion,
    domicilio.ciudad,
  ].filter(Boolean);
  return partes.length > 0 ? partes.join(' · ') : '—';
}

export function formatearAsiento(numero: string | undefined, posicion?: string | null): string {
  if (!numero) return '—';
  return posicion ? `${numero} (${posicion})` : numero;
}
