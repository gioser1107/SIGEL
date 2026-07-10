import {
  tieneErroresCliente,
  validarFormularioCliente,
  type ErroresFormularioCliente,
  type FormularioCliente,
} from '../../../../utils/validacionesCliente';
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

  return {
    errores,
    errorDomicilio,
    valido: !tieneErroresCliente(errores) && !errorDomicilio,
  };
}
