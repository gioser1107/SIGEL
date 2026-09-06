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

const MOTIVO_NO_DISPONIBLE: Record<string, string> = {
  sin_unidad_transporte: 'sin unidad de transporte',
  sin_asientos_en_unidad: 'sin asientos en la unidad',
  asientos_completos: 'sin cupos',
  viaje_no_activo: 'viaje no activo',
};

export function textoMotivoNoDisponible(motivo: string | null | undefined): string {
  if (!motivo) return 'no disponible';
  return MOTIVO_NO_DISPONIBLE[motivo] ?? 'no disponible';
}

export function etiquetaViajeDisponible(viaje: ViajeDisponibleReserva): string {
  const fecha = formatearFechaSalidaViaje(viaje.fecha_salida);
  const destino = viaje.destino_nombre ?? `Viaje #${viaje.id}`;
  if (!viaje.disponibilidad.disponible_para_reserva) {
    return `${destino} — ${fecha} — ${textoMotivoNoDisponible(viaje.disponibilidad.motivo_no_disponible)}`;
  }
  const libres = viaje.disponibilidad.asientos_disponibles;
  return `${destino} — ${fecha} — ${libres} asientos libres`;
}

export function detalleViajeDisponible(viaje: ViajeDisponibleReserva): string {
  const partes: string[] = [];
  const placa = viaje.disponibilidad.unidad_placa;
  if (placa) partes.push(`Placa: ${placa}`);
  partes.push(`Precio: ${viaje.precio_base_eur} € por pasajero`);
  if (!viaje.disponibilidad.disponible_para_reserva) {
    partes.push(`No reservable: ${textoMotivoNoDisponible(viaje.disponibilidad.motivo_no_disponible)}`);
  }
  return partes.join(' · ');
}
