import { formularioAPayload } from '../../../../pages/admin/Clientes/utils/mapeoFormulario';
import type { PasajeroExtraPublicoDTO } from '../../../../services/reservas';
import type { ValorDomicilioAcompanante } from '../../../puntos-recogida/DomicilioRecogidaAcompanante';
import type { FormularioCliente } from '../../../../utils/validacionesCliente';

export function acompananteFormularioAPayload(
  ficha: FormularioCliente,
  es_menor: boolean,
  domicilio: ValorDomicilioAcompanante,
): PasajeroExtraPublicoDTO {
  const base = formularioAPayload(ficha);
  return {
    ...base,
    telefono: base.telefono ?? undefined,
    telefono_secundario: base.telefono_secundario ?? undefined,
    es_menor,
    punto_recogida_id: domicilio.punto_recogida_id,
    puntos_recogida: domicilio.puntos_recogida ? [domicilio.puntos_recogida] : undefined,
  };
}
