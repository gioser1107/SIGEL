import apiRequest, { obtenerTokenSesion } from './api';

export interface ArchivoRespaldo {
  archivo: string;
  tipo: 'seguridad' | 'negocio' | 'otro';
  marca: string;
  bytes: number;
  creado_en: string;
}

export interface GrupoRespaldo {
  marca: string;
  archivos: ArchivoRespaldo[];
}

export interface ListadoRespaldos {
  bases: { seguridad: string; negocio: string };
  retencion_dias: number;
  total: number;
  respaldos: GrupoRespaldo[];
}

export interface ResultadoRespaldo {
  marca: string;
  metodo: string;
  retencion_dias: number;
  archivos: ArchivoRespaldo[];
  eliminados_por_retencion: string[];
}

export interface EstadoBase {
  nombre: string;
  disponible: boolean;
  detalle?: string;
}

export function consultarEstadoBases() {
  return apiRequest<{ seguridad: EstadoBase; negocio: EstadoBase }>(
    '/respaldos/estado',
    { requiresAuth: true },
  );
}

export function listarRespaldos() {
  return apiRequest<ListadoRespaldos>('/respaldos', { requiresAuth: true });
}

export function crearRespaldo() {
  return apiRequest<ResultadoRespaldo>('/respaldos', {
    method: 'POST',
    requiresAuth: true,
  });
}

export function restaurarRespaldo(archivo: string) {
  return apiRequest<{ archivo: string; tipo: string; marca: string; metodo: string; mensaje: string }>(
    `/respaldos/${encodeURIComponent(archivo)}/restaurar`,
    { method: 'POST', requiresAuth: true },
  );
}

export async function descargarRespaldo(archivo: string): Promise<void> {
  const token = obtenerTokenSesion();
  const base = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
  const respuesta = await fetch(`${base}/respaldos/${encodeURIComponent(archivo)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!respuesta.ok) {
    throw new Error('No se pudo descargar el respaldo');
  }
  const blob = await respuesta.blob();
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = archivo;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}
