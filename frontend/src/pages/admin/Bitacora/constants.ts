export const MODULOS = [
  { valor: '', etiqueta: 'Todos los módulos' },
  { valor: 'seguridad', etiqueta: 'Seguridad' },
  { valor: 'catalogo', etiqueta: 'Catálogo' },
  { valor: 'viajes', etiqueta: 'Viajes' },
  { valor: 'reservas', etiqueta: 'Reservas' },
  { valor: 'pagos', etiqueta: 'Pagos' },
  { valor: 'conciliacion', etiqueta: 'Conciliación' },
  { valor: 'cotizaciones', etiqueta: 'Cotizaciones' },
  { valor: 'abordaje', etiqueta: 'Abordaje' },
  { valor: 'sistema', etiqueta: 'Sistema' },
];

export const ACCIONES = [
  { valor: '', etiqueta: 'Todas las acciones' },
  { valor: 'INSERT', etiqueta: 'Crear' },
  { valor: 'UPDATE', etiqueta: 'Actualizar' },
  { valor: 'DELETE', etiqueta: 'Eliminar' },
  { valor: 'LOGIN', etiqueta: 'Inicio de sesión' },
  { valor: 'LOGOUT', etiqueta: 'Cierre de sesión' },
  { valor: 'VALIDAR', etiqueta: 'Validar' },
  { valor: 'RECHAZAR', etiqueta: 'Rechazar' },
  { valor: 'ANULAR', etiqueta: 'Anular' },
  { valor: 'ERROR', etiqueta: 'Error' },
  { valor: 'OTRO', etiqueta: 'Otro' },
];

export const ETIQUETA_MODULO: Record<string, string> = {
  seguridad: 'Seguridad',
  catalogo: 'Catálogo',
  viajes: 'Viajes',
  reservas: 'Reservas',
  pagos: 'Pagos',
  conciliacion: 'Conciliación',
  cotizaciones: 'Cotizaciones',
  abordaje: 'Abordaje',
  sistema: 'Sistema',
};

export const ETIQUETA_ACCION: Record<string, string> = {
  INSERT: 'Crear',
  UPDATE: 'Actualizar',
  DELETE: 'Eliminar',
  LOGIN: 'Inicio de sesión',
  LOGOUT: 'Cierre de sesión',
  VALIDAR: 'Validar',
  RECHAZAR: 'Rechazar',
  ANULAR: 'Anular',
  ERROR: 'Error',
  OTRO: 'Otro',
};

export const LIMITE_PAGINA = 10;
