const API_ORIGEN = (import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api').replace(
  /\/api\/?$/,
  '',
);

/** Convierte rutas locales (/api/archivos/...) en URL absoluta del backend. */
export function resolverUrlArchivo(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return `${API_ORIGEN}${url}`;
  return url;
}
