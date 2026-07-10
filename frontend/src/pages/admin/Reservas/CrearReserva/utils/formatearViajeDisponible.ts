import type { ViajeDisponibleReserva } from '../../../../../types/reservas';

export function formatearFechaSalidaViaje(fechaIso: string): string {
  const fecha = new Date(fechaIso);
  if (Number.isNaN(fecha.getTime())) return fechaIso;
  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const anio = fecha.getFullYear();
  const hora = String(fecha.getHours()).padStart(2, '0');
  const min = String(fecha.getMinutes()).padStart(2, '0');
  return `${dia}/${mes}/${anio} ${hora}:${min}`;
}

export function etiquetaViajeDisponible(viaje: ViajeDisponibleReserva): string {
  const fecha = formatearFechaSalidaViaje(viaje.fecha_salida);
  const libres = viaje.disponibilidad.asientos_disponibles;
  return `${viaje.destino_nombre} — ${fecha} — ${libres} asientos libres`;
}

export function detalleViajeDisponible(viaje: ViajeDisponibleReserva): string {
  const partes: string[] = [];
  const placa = viaje.disponibilidad.unidad_placa;
  if (placa) partes.push(`Placa: ${placa}`);
  partes.push(`Precio: ${viaje.precio_base_eur} € por pasajero`);
  return partes.join(' · ');
}
