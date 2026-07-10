/** Códigos de operadora móvil Venezuela (formato 04XX). */
export const CODIGOS_TELEFONO_VE = ['0424', '0414', '0426', '0416', '0412', '0422'] as const;

const REGEX_CORREO = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const REGEX_NOMBRE = /^[A-Za-záéíóúÁÉÍÓÚüÜñÑ\s'-]{2,80}$/;
const REGEX_CODIGO = /^[A-Za-z0-9_\-]{1,30}$/;
const REGEX_PLACA_VE = /^([A-Z]{2,3}\d{1,4}[A-Z]{0,2}|\d{1,4}[A-Z]{2,3})$/i;
const REGEX_MONTO_EUR = /^\d{1,7}(\.\d{1,2})?$/;

export function esCorreoValido(correo: string): boolean {
  return REGEX_CORREO.test(correo.trim());
}

export function esNombreValido(texto: string): boolean {
  return REGEX_NOMBRE.test(texto.trim());
}

export function esCodigoValido(codigo: string): boolean {
  return REGEX_CODIGO.test(codigo.trim());
}

export function esPlacaVeValida(placa: string): boolean {
  return REGEX_PLACA_VE.test(placa.trim().replace(/\s/g, ''));
}

export function esMontoEurValido(valor: number): boolean {
  if (!Number.isFinite(valor) || valor <= 0) return false;
  return REGEX_MONTO_EUR.test(String(valor));
}

export function validarFormularioDestino(form: {
  nombre: string;
  descripcion?: string | null;
  precio_base_eur: number;
}): string | null {
  const nombre = form.nombre.trim();
  if (!nombre) return 'El nombre es obligatorio.';
  if (nombre.length < 3) return 'El nombre debe tener al menos 3 caracteres.';
  if (!esNombreValido(nombre)) return 'El nombre solo puede contener letras, espacios y guiones.';

  const desc = (form.descripcion ?? '').trim();
  if (desc && desc.length < 10) return 'La descripción debe tener al menos 10 caracteres.';

  if (form.precio_base_eur < 0) return 'El precio base no puede ser negativo.';
  if (form.precio_base_eur === 0) return 'El precio base debe ser mayor a 0.';
  if (!esMontoEurValido(form.precio_base_eur)) return 'Ingresa un precio válido (máx. 2 decimales).';

  return null;
}

export function validarFormularioUnidad(form: {
  placa: string;
  modelo?: string | null;
  capacidad: number;
}): string | null {
  const placa = form.placa.trim();
  if (!placa) return 'La placa es obligatoria.';
  if (!esPlacaVeValida(placa)) {
    return 'Placa no válida (ej: AA0TRV01 o 123ABC).';
  }

  const modelo = (form.modelo ?? '').trim();
  if (modelo && modelo.length < 2) return 'El modelo debe tener al menos 2 caracteres.';

  if (!Number.isInteger(form.capacidad) || form.capacidad < 1) {
    return 'La capacidad debe ser un entero mayor a 0.';
  }
  if (form.capacidad > 100) return 'La capacidad no puede superar 100 pasajeros.';

  return null;
}

export function validarFormularioViaje(form: {
  destino_id: number;
  unidad_id: number;
  fecha_salida: string;
  fecha_regreso?: string | null;
}): string | null {
  if (!form.destino_id) return 'Selecciona un destino.';
  if (!form.unidad_id) return 'Selecciona una unidad de transporte.';
  if (!form.fecha_salida) return 'La fecha de salida es obligatoria.';

  const salida = new Date(form.fecha_salida);
  if (Number.isNaN(salida.getTime())) return 'Fecha de salida no válida.';

  if (form.fecha_regreso) {
    const regreso = new Date(form.fecha_regreso);
    if (Number.isNaN(regreso.getTime())) return 'Fecha de regreso no válida.';
    if (regreso <= salida) return 'La fecha de regreso debe ser posterior a la salida.';
  }

  return null;
}

export function validarFormularioCotizacion(form: {
  cliente_id?: number;
  destino_id?: number;
  precio_cotizado_eur?: number | null;
  valida_hasta?: string | null;
}): string | null {
  if (!form.cliente_id) return 'Selecciona un cliente.';
  if (!form.destino_id) return 'Selecciona un destino.';

  if (form.precio_cotizado_eur != null && form.precio_cotizado_eur !== 0) {
    if (!esMontoEurValido(form.precio_cotizado_eur)) {
      return 'El precio cotizado debe ser un monto positivo válido.';
    }
  }

  if (form.valida_hasta) {
    const hasta = new Date(form.valida_hasta);
    if (Number.isNaN(hasta.getTime())) return 'Fecha de vigencia no válida.';
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    if (hasta < hoy) return 'La fecha de vigencia no puede ser anterior a hoy.';
  }

  return null;
}

export function validarFormularioRol(form: { nombre: string; descripcion?: string }): string | null {
  const nombre = form.nombre.trim();
  if (!nombre) return 'El nombre del rol es obligatorio.';
  if (nombre.length < 3) return 'El nombre debe tener al menos 3 caracteres.';
  if (!esNombreValido(nombre)) return 'El nombre solo puede contener letras, espacios y guiones.';
  return null;
}

export function validarFormularioPermiso(form: { descripcion: string }): string | null {
  const slug = form.descripcion.trim();
  if (!slug) return 'El identificador del permiso es obligatorio.';
  if (!esCodigoValido(slug)) {
    return 'Usa solo letras, números, guiones y guiones bajos (ej: gestionar_reservas).';
  }
  return null;
}

export interface PasajeroValidacion {
  cliente_id: number;
  precio_pasajero_eur: number;
}

export function validarPasajerosReserva(
  pasajeros: PasajeroValidacion[],
  titularPuntoRecogidaId: number | undefined,
  titularTieneDomicilios: boolean,
): string | null {
  for (let i = 0; i < pasajeros.length; i += 1) {
    if (!pasajeros[i].cliente_id || pasajeros[i].cliente_id <= 0) {
      return `Selecciona un cliente registrado para el acompañante ${i + 1}.`;
    }
    if (pasajeros[i].precio_pasajero_eur < 0) {
      return `El precio del acompañante ${i + 1} no puede ser negativo.`;
    }
  }

  if (titularTieneDomicilios && !titularPuntoRecogidaId) {
    return 'Selecciona el domicilio de recogida del titular.';
  }

  return null;
}

export function parsearTelefonoVe(telefono: string | null | undefined): {
  codigo: string;
  numero: string;
} {
  if (!telefono) return { codigo: '', numero: '' };

  const limpio = telefono.replace(/\D/g, '');
  for (const codigo of CODIGOS_TELEFONO_VE) {
    if (limpio.startsWith(codigo)) {
      return { codigo, numero: limpio.slice(codigo.length) };
    }
  }

  return { codigo: '', numero: '' };
}

export function armarTelefonoVe(codigo: string, numero: string): string | undefined {
  const num = numero.replace(/\D/g, '');
  if (!codigo && !num) return undefined;
  return `${codigo}${num}`;
}

export function validarTelefonoVe(
  codigo: string,
  numero: string
): string | null {
  const num = numero.replace(/\D/g, '');

  if (!codigo && !num) return null;

  if (!codigo) {
    return 'Selecciona el código de operadora.';
  }

  if (!CODIGOS_TELEFONO_VE.includes(codigo as (typeof CODIGOS_TELEFONO_VE)[number])) {
    return 'Código de operadora no válido.';
  }

  if (!num) {
    return 'Escribe el número de teléfono.';
  }

  if (!/^\d{7}$/.test(num)) {
    return 'El número debe tener exactamente 7 dígitos.';
  }

  return null;
}

export interface ErroresFormularioUsuario {
  nombre?: string;
  apellido?: string;
  correo?: string;
  telefono?: string;
  rol_id?: string;
  contrasena?: string;
}

export function validarFormularioUsuario(
  datos: {
    nombre: string;
    apellido: string;
    correo: string;
    telefono_codigo: string;
    telefono_numero: string;
    rol_id: string;
    contrasena: string;
  },
  modo: 'crear' | 'editar'
): ErroresFormularioUsuario {
  const errores: ErroresFormularioUsuario = {};

  const nombre = datos.nombre.trim();
  if (!nombre) {
    errores.nombre = 'El nombre es obligatorio.';
  } else if (!esNombreValido(nombre)) {
    errores.nombre = 'El nombre solo puede contener letras, espacios y guiones (mín. 2).';
  }

  const apellido = datos.apellido.trim();
  if (!apellido) {
    errores.apellido = 'El apellido es obligatorio.';
  } else if (!esNombreValido(apellido)) {
    errores.apellido = 'El apellido solo puede contener letras, espacios y guiones (mín. 2).';
  }

  const correo = datos.correo.trim();
  if (!correo) {
    errores.correo = 'El correo es obligatorio.';
  } else if (!esCorreoValido(correo)) {
    errores.correo = 'Ingresa un correo electrónico válido (ej: usuario@travelbqto.com).';
  }

  const errorTelefono = validarTelefonoVe(datos.telefono_codigo, datos.telefono_numero);
  if (errorTelefono) {
    errores.telefono = errorTelefono;
  }

  if (modo === 'crear' && !datos.rol_id) {
    errores.rol_id = 'Selecciona un rol para el usuario.';
  }

  if (modo === 'crear') {
    if (!datos.contrasena) {
      errores.contrasena = 'La contraseña es obligatoria.';
    } else if (datos.contrasena.length < 6) {
      errores.contrasena = 'La contraseña debe tener al menos 6 caracteres.';
    }
  } else if (datos.contrasena && datos.contrasena.length < 6) {
    errores.contrasena = 'La nueva contraseña debe tener al menos 6 caracteres.';
  }

  return errores;
}

export function tieneErrores(errores: ErroresFormularioUsuario): boolean {
  return Object.keys(errores).length > 0;
}
