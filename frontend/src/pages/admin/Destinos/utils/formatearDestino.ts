import type { Destino } from '../../../../types/destino';

export function formatFecha(fecha: string | null | undefined): string {
  if (!fecha) return '—';
  return new Date(fecha).toLocaleDateString('es-VE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatPrecio(eur: number | null | undefined): string {
  if (eur === null || eur === undefined) return '—';
  return `€ ${eur.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`;
}

export function filtrarPorBusqueda(destinos: Destino[], busqueda: string): Destino[] {
  const q = busqueda.trim().toLowerCase();
  if (!q) return destinos;
  return destinos.filter(
    (d) =>
      d.nombre.toLowerCase().includes(q) ||
      (d.descripcion ?? '').toLowerCase().includes(q),
  );
}

export function varianteEstadoDestino(activo: boolean): 'exito' | 'neutro' {
  return activo ? 'exito' : 'neutro';
}
