import {
  CODIGOS_TELEFONO_VE,
  MENSAJE_NOMBRE_PERSONA,
  armarTelefonoVe,
  esNombreValido,
  parsearTelefonoVe,
  validarTelefonoVe,
} from './validacionesFormulario';
import type { TipoCliente, TipoDocumento } from '../types/cliente';

const TIPOS_SOLO_NUMEROS: TipoDocumento[] = ['V', 'E', 'P'];

/** Filtra el valor según el tipo de documento (cédula = solo dígitos). */
export function sanitizarNumeroDocumento(tipo: TipoDocumento, valor: string): string {
  if (TIPOS_SOLO_NUMEROS.includes(tipo)) {
    return valor.replace(/\D/g, '').slice(0, 9);
  }
  return valor.replace(/[^A-Za-z0-9]/g, '').slice(0, 15);
}

export function documentoSoloNumeros(tipo: TipoDocumento): boolean {
  return TIPOS_SOLO_NUMEROS.includes(tipo);
}

export const PREFIJO_TELEFONO_FIJO = 'fijo' as const;

export interface CamposTelefono {
  prefijo: string;
  numero: string;
  fijo: string;
}

export function parsearTelefonoCliente(telefono: string | null | undefined): CamposTelefono {
  if (!telefono) return { prefijo: '', numero: '', fijo: '' };

  const { codigo, numero } = parsearTelefonoVe(telefono);
  if (codigo) {
    return { prefijo: codigo, numero, fijo: '' };
  }

  return { prefijo: PREFIJO_TELEFONO_FIJO, numero: '', fijo: telefono.replace(/\D/g, '') };
}

export function armarTelefonoCliente(campos: CamposTelefono): string | undefined {
  if (campos.prefijo === PREFIJO_TELEFONO_FIJO) {
    const fijo = campos.fijo.replace(/\D/g, '');
    return fijo || undefined;
  }
  return armarTelefonoVe(campos.prefijo, campos.numero);
}

export function validarTelefonoCliente(
  campos: CamposTelefono,
  obligatorio = false
): string | null {
  if (campos.prefijo === PREFIJO_TELEFONO_FIJO) {
    const fijo = campos.fijo.replace(/\D/g, '');
    if (!fijo) return obligatorio ? 'Escribe el número de teléfono fijo.' : null;
    if (!/^0\d{10}$/.test(fijo) && !/^0\d{9}$/.test(fijo)) {
      return 'El teléfono fijo debe iniciar con 0 y tener 10 u 11 dígitos.';
    }
    return null;
  }

  const errorMovil = validarTelefonoVe(campos.prefijo, campos.numero);
  if (errorMovil && obligatorio) return errorMovil;
  if (!campos.prefijo && !campos.numero.replace(/\D/g, '')) {
    return obligatorio ? 'El teléfono principal es obligatorio.' : null;
  }
  return errorMovil;
}

export interface FormularioCliente {
  tipo_cliente: TipoCliente;
  tipo_documento: TipoDocumento;
  numero_documento: string;
  nombre: string;
  apellido: string;
  razon_social: string;
  telefono_prefijo: string;
  telefono_numero: string;
  telefono_fijo: string;
  telefono_sec_prefijo: string;
  telefono_sec_numero: string;
  telefono_sec_fijo: string;
  direccion: string;
  estado_id: string;
  ciudad_id: string;
  notas: string;
}

export interface ErroresFormularioCliente {
  tipo_cliente?: string;
  tipo_documento?: string;
  numero_documento?: string;
  nombre?: string;
  apellido?: string;
  razon_social?: string;
  telefono?: string;
  telefono_secundario?: string;
  direccion?: string;
  estado_id?: string;
  ciudad_id?: string;
}

export function validarFormularioCliente(datos: FormularioCliente): ErroresFormularioCliente {
  const errores: ErroresFormularioCliente = {};

  if (!datos.tipo_cliente) {
    errores.tipo_cliente = 'Selecciona el tipo de cliente.';
  }

  if (!datos.tipo_documento) {
    errores.tipo_documento = 'Selecciona el tipo de documento.';
  }

  const documento = datos.numero_documento.trim();
  if (!documento) {
    errores.numero_documento = 'El número de documento es obligatorio.';
  } else if (documentoSoloNumeros(datos.tipo_documento) && !/^\d+$/.test(documento)) {
    errores.numero_documento = 'La cédula solo puede contener números.';
  } else if (documento.length < 4) {
    errores.numero_documento = 'El documento debe tener al menos 4 caracteres.';
  } else if (documentoSoloNumeros(datos.tipo_documento) && documento.length > 9) {
    errores.numero_documento = 'La cédula no puede tener más de 9 dígitos.';
  }

  const nombre = datos.nombre.trim();
  if (!nombre) {
    errores.nombre = 'El nombre es obligatorio.';
  } else if (!esNombreValido(nombre)) {
    errores.nombre = MENSAJE_NOMBRE_PERSONA;
  }

  const apellido = datos.apellido.trim();
  if (!apellido) {
    errores.apellido = 'El apellido es obligatorio.';
  } else if (!esNombreValido(apellido)) {
    errores.apellido = MENSAJE_NOMBRE_PERSONA;
  }

  if (datos.tipo_cliente === 'juridico' && !datos.razon_social.trim()) {
    errores.razon_social = 'La razón social es obligatoria para empresas.';
  }

  const errorTel = validarTelefonoCliente(
    {
      prefijo: datos.telefono_prefijo,
      numero: datos.telefono_numero,
      fijo: datos.telefono_fijo,
    },
    true
  );
  if (errorTel) errores.telefono = errorTel;

  const errorTelSec = validarTelefonoCliente({
    prefijo: datos.telefono_sec_prefijo,
    numero: datos.telefono_sec_numero,
    fijo: datos.telefono_sec_fijo,
  });
  if (errorTelSec) errores.telefono_secundario = errorTelSec;

  if (!datos.estado_id) {
    errores.estado_id = 'Selecciona un estado.';
  }

  if (!datos.ciudad_id) {
    errores.ciudad_id = 'Selecciona una ciudad.';
  }

  return errores;
}

export function tieneErroresCliente(errores: ErroresFormularioCliente): boolean {
  return Object.keys(errores).length > 0;
}

export { CODIGOS_TELEFONO_VE };
