import {
  tieneErroresCliente,
  validarFormularioCliente,
  type ErroresFormularioCliente,
  type FormularioCliente,
} from '../../../../utils/validacionesCliente';
import { errorPoliticaMenor } from '../../../../utils/politicaMenor';
import type { PasajeroPublico } from '../pasajeroPublico';

export function validarFichaPasajeroPublico(ficha: FormularioCliente): {
  errores: ErroresFormularioCliente;
  valido: boolean;
} {
  const errores = validarFormularioCliente(ficha);
  return {
    errores,
    valido: !tieneErroresCliente(errores),
  };
}

export function validarPasajeroPublico(p: PasajeroPublico): {
  errores: ErroresFormularioCliente;
  errorDomicilio: string | null;
  valido: boolean;
} {
  const errores = validarFormularioCliente(p.ficha);
  let errorDomicilio: string | null = null;

  if (p.domicilio.punto_recogida_id == null && !p.domicilio.puntos_recogida) {
    errorDomicilio =
      p.domicilios.length > 0
        ? 'Selecciona el domicilio de recogida.'
        : 'Completa el domicilio de recogida.';
  }

  const errorMenor = errorPoliticaMenor(p.es_menor, p.fecha_nacimiento, p.partida_nacimiento_url);

  return {
    errores,
    errorDomicilio: errorDomicilio ?? errorMenor,
    valido: !tieneErroresCliente(errores) && !errorDomicilio && !errorMenor,
  };
}
