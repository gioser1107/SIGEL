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

function parsearFechaBitacora(iso: string): Date {
  const texto = iso.trim();
  const tieneZona = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(texto);
  return new Date(tieneZona ? texto : `${texto.replace(' ', 'T')}Z`);
}

// Convierte la fecha ISO (UTC) a formato legible dd/mm/aaaa hh:mm en hora de Caracas
export function formatFechaHora(iso: string): string {
  const fecha = parsearFechaBitacora(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  return fecha.toLocaleString('es-VE', {
    timeZone: 'America/Caracas',
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
