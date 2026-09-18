import { formularioAPayload } from '../../../../pages/admin/Clientes/utils/mapeoFormulario';
import type { PasajeroExtraPublicoDTO } from '../../../../services/reservas';
import type { ValorDomicilioAcompanante } from '../../../puntos-recogida/DomicilioRecogidaAcompanante';
import type { FormularioCliente } from '../../../../utils/validacionesCliente';

export function acompananteFormularioAPayload(
  ficha: FormularioCliente,
  es_menor: boolean,
  domicilio: ValorDomicilioAcompanante,
  extras?: { fecha_nacimiento?: string; partida_nacimiento_url?: string | null; ocupa_asiento?: boolean },
): PasajeroExtraPublicoDTO {
  const base = formularioAPayload(ficha);
  return {
    ...base,
    telefono: base.telefono ?? undefined,
    telefono_secundario: base.telefono_secundario ?? undefined,
    es_menor,
    fecha_nacimiento: extras?.fecha_nacimiento || undefined,
    partida_nacimiento_url: extras?.partida_nacimiento_url || undefined,
    ocupa_asiento: extras?.ocupa_asiento,
    punto_recogida_id: domicilio.punto_recogida_id,
    puntos_recogida: domicilio.puntos_recogida ? [domicilio.puntos_recogida] : undefined,
  };
}
