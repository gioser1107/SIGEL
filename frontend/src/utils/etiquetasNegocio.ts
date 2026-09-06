/** Textos de negocio: nunca mostrar IDs internos ni enums crudos. */

export const SIN_DATO = {
  cliente: 'Cliente sin nombre',
  destino: 'Destino no asignado',
  viaje: 'Viaje sin destino',
  unidad: 'Unidad sin placa',
  punto: 'Domicilio de recogida',
  guia: 'Guía sin nombre',
  banco: 'Banco no asignado',
} as const;

export function textoVisible(valor: string | null | undefined, siFalta: string): string {
  const t = valor?.trim();
  return t || siFalta;
}

export function codigoReserva(id: number): string {
  return `RES-${String(id).padStart(5, '0')}`;
}

const ETIQUETAS_ESTADO: Record<string, string> = {
  planificado: 'Planificado',
  en_curso: 'En curso',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  abonada: 'Abonada',
  cancelada: 'Cancelada',
  anulado: 'Anulado',
  anulada: 'Anulada',
  solicitada: 'Solicitada',
  aceptada: 'Aceptada',
  vencida: 'Vencida',
  en_validacion: 'En validación',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  activo: 'Activo',
  inactivo: 'Inactivo',
  abordado: 'Abordado',
  no_presentado: 'No presentado',
};

export function claveEstado(valor: string): string {
  return valor
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');
}

export function etiquetaEstado(valor?: string | null): string {
  if (!valor?.trim()) return '—';
  const clave = claveEstado(valor);
  if (ETIQUETAS_ESTADO[clave]) return ETIQUETAS_ESTADO[clave];
  if (ETIQUETAS_ESTADO[valor]) return ETIQUETAS_ESTADO[valor];
  return valor.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}
