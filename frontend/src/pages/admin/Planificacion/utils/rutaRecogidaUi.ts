import type {
  CandidatoRutaRecogida,
  ClienteRutaRecogida,
  DomicilioRutaRecogida,
  ParadaRutaRecogida,
  ParadaRutaRecogidaDTO,
} from '../../../../types/viaje';
import { combinarHoraConFechaSalida, formatHora } from './formatearViaje';

export interface ParadaRutaLocal extends ParadaRutaRecogida {
  horaLocal: string;
}

export function nombreViajero(cliente: ClienteRutaRecogida): string {
  return `${cliente.nombre} ${cliente.apellido}`.trim();
}

export function textoDomicilio(domicilio: DomicilioRutaRecogida | null | undefined): string {
  if (!domicilio) return 'Sin domicilio registrado';
  const partes = [
    domicilio.direccion,
    domicilio.referencia,
    [domicilio.ciudad, domicilio.estado].filter(Boolean).join(', '),
  ].filter(Boolean);
  return partes.join(' · ');
}

export function paradaApiALocal(
  parada: ParadaRutaRecogida,
  fechaSalida: string,
): ParadaRutaLocal {
  return {
    ...parada,
    horaLocal: parada.hora_programada ? formatHora(parada.hora_programada) : '',
  };
}

export function candidatoAParadaLocal(
  candidato: CandidatoRutaRecogida,
  orden: number,
): ParadaRutaLocal | null {
  if (!candidato.domicilio) return null;
  return {
    reserva_cliente_id: candidato.reserva_cliente_id,
    reserva_id: candidato.reserva_id,
    orden,
    hora_programada: null,
    horaLocal: '',
    notas: null,
    es_titular: candidato.es_titular,
    cliente: candidato.cliente,
    domicilio: candidato.domicilio,
  };
}

export function paradasLocalesADto(
  paradas: ParadaRutaLocal[],
  fechaSalida: string,
): ParadaRutaRecogidaDTO[] {
  return paradas.map((p, index) => ({
    reserva_cliente_id: p.reserva_cliente_id,
    orden: index + 1,
    hora_programada: p.horaLocal
      ? combinarHoraConFechaSalida(fechaSalida, p.horaLocal)
      : null,
    notas: p.notas?.trim() ? p.notas.trim() : null,
  }));
}

export function reordenarParadas(
  paradas: ParadaRutaLocal[],
  desde: number,
  hacia: number,
): ParadaRutaLocal[] {
  if (desde === hacia || desde < 0 || hacia < 0) return paradas;
  const copia = [...paradas];
  const [item] = copia.splice(desde, 1);
  if (!item) return paradas;
  copia.splice(hacia, 0, item);
  return copia.map((p, i) => ({ ...p, orden: i + 1 }));
}
