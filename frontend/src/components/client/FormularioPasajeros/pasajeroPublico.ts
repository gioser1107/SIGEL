import { FORM_VACIO } from '../../../pages/admin/Clientes/constants';
import type { ValorDomicilioAcompanante } from '../../puntos-recogida/DomicilioRecogidaAcompanante';
import type { PuntoRecogida } from '../../../types/puntoRecogida';
import type { ErroresFormularioCliente, FormularioCliente } from '../../../utils/validacionesCliente';

const DOMICILIO_VACIO: ValorDomicilioAcompanante = {
  punto_recogida_id: null,
  puntos_recogida: null,
};

export interface PasajeroPublico {
  id: number;
  ficha: FormularioCliente;
  errores: ErroresFormularioCliente;
  es_menor: boolean;
  domicilios: PuntoRecogida[];
  buscandoDocumento: boolean;
  domicilio: ValorDomicilioAcompanante;
}

export function pasajeroVacio(id: number): PasajeroPublico {
  return {
    id,
    ficha: { ...FORM_VACIO },
    errores: {},
    es_menor: false,
    domicilios: [],
    buscandoDocumento: false,
    domicilio: { ...DOMICILIO_VACIO },
  };
}

export function clonarPasajero(p: PasajeroPublico): PasajeroPublico {
  return {
    ...p,
    ficha: { ...p.ficha },
    errores: { ...p.errores },
    domicilios: [...p.domicilios],
    domicilio: p.domicilio.puntos_recogida
      ? { ...p.domicilio, puntos_recogida: { ...p.domicilio.puntos_recogida } }
      : { ...p.domicilio },
  };
}

export function etiquetaPasajero(p: PasajeroPublico): string {
  const nombre = `${p.ficha.nombre} ${p.ficha.apellido}`.trim();
  if (nombre) return nombre;
  const doc = p.ficha.numero_documento.trim();
  if (doc) return `${p.ficha.tipo_documento}-${doc}`;
  return 'Acompañante sin nombre';
}

export function pasajeroCompleto(p: PasajeroPublico): boolean {
  return Boolean(
    p.ficha.nombre.trim() &&
      p.ficha.apellido.trim() &&
      p.ficha.numero_documento.trim() &&
      (p.domicilio.punto_recogida_id != null || p.domicilio.puntos_recogida),
  );
}
