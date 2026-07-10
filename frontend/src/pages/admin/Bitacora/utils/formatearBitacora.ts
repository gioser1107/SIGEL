import type { VarianteBadge } from '../../../../components/admin';
import type { EntradaBitacora } from '../../../../types/bitacora';

// Devuelve la variante visual del badge según el tipo de acción registrada
export function resolverVarianteAccion(accion: string): VarianteBadge {
  const mapa: Record<string, VarianteBadge> = {
    INSERT: 'exito',
    UPDATE: 'info',
    DELETE: 'error',
    LOGIN: 'exito',
    LOGOUT: 'neutro',
    VALIDAR: 'exito',
    RECHAZAR: 'error',
    ANULAR: 'advertencia',
    ERROR: 'error',
    OTRO: 'neutro',
  };
  return mapa[accion] ?? 'neutro';
}

// Convierte la fecha ISO a formato legible dd/mm/aaaa hh:mm (zona VE)
export function formatFechaHora(iso: string): string {
  return new Date(iso).toLocaleString('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Resuelve el nombre visible del usuario: nombre → correo → "Sistema"
export function etiquetaUsuario(entrada: EntradaBitacora): string {
  if (entrada.usuario_nombre) return entrada.usuario_nombre;
  if (entrada.usuario_correo) return entrada.usuario_correo;
  return 'Sistema';
}
