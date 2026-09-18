/** Un viaje incluye hospedaje si dura más de 24 horas. No hace falta un campo extra en la BD. */
export const HORAS_MINIMAS_HOSPEDAJE = 24;

const MS_MINIMOS_HOSPEDAJE = HORAS_MINIMAS_HOSPEDAJE * 60 * 60 * 1000;

export function viajeIncluyeHospedaje(
  fechaSalida?: string | Date | null,
  fechaRegreso?: string | Date | null,
): boolean {
  if (!fechaSalida || !fechaRegreso) return false;
  const salida = new Date(fechaSalida).getTime();
  const regreso = new Date(fechaRegreso).getTime();
  if (!Number.isFinite(salida) || !Number.isFinite(regreso)) return false;
  return regreso - salida > MS_MINIMOS_HOSPEDAJE;
}

export function textoAvisoHospedajeViaje(
  fechaSalida?: string | Date | null,
  fechaRegreso?: string | Date | null,
): string | null {
  if (!fechaSalida || !fechaRegreso) return null;
  return viajeIncluyeHospedaje(fechaSalida, fechaRegreso)
    ? 'Este viaje dura más de 24 horas: la reserva incluirá hospedaje (compartido o particular).'
    : 'Este viaje dura 24 horas o menos: no hay hospedaje en la reserva.';
}

export function reservaOfreceHospedaje(viaje?: {
  incluye_hospedaje?: boolean;
  fecha_salida?: string | Date | null;
  fecha_regreso?: string | Date | null;
} | null): boolean {
  if (!viaje) return false;
  if (typeof viaje.incluye_hospedaje === 'boolean') return viaje.incluye_hospedaje;
  return viajeIncluyeHospedaje(viaje.fecha_salida, viaje.fecha_regreso);
}
