/**
 * api.ts ��� Configuraci?n base de las peticiones HTTP.
 */

const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

export class ErrorApi extends Error {
  status: number;
  detalle?: unknown;

  constructor(mensaje: string, status: number, detalle?: unknown) {
    super(mensaje);
    this.name = 'ErrorApi';
    this.status = status;
    this.detalle = detalle;
  }
}

type Manejador401 = () => void;
let manejador401: Manejador401 | null = null;

/** Registra callback global para cerrar sesi?n ante un 401. */
export function registrarManejador401(callback: Manejador401): void {
  manejador401 = callback;
}

/** JWT valido: tres segmentos separados por punto. */
function esJwtValido(token: string): boolean {
  return token.split('.').length === 3 && token.startsWith('eyJ');
}

export function obtenerTokenSesion(): string | null {
  const raw = localStorage.getItem('auth_token');
  if (!raw) return null;

  let token = raw.trim();
  if (token.toLowerCase().startsWith('bearer ')) {
    token = token.slice(7).trim();
  }

  if (token.startsWith('mock_') || !esJwtValido(token)) {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_usuario');
    return null;
  }

  return token;
}

export function guardarTokenSesion(token: string): void {
  const limpio = token.trim();
  if (!esJwtValido(limpio)) {
    throw new Error('El servidor devolvi? un token de sesi?n inv?lido');
  }
  localStorage.setItem('auth_token', limpio);
}

export function limpiarSesionLocal(): void {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_usuario');
}

function extraerMensajeError(error: Record<string, unknown>, status: number): string {
  if (typeof error.detail === 'string') return error.detail;
  if (Array.isArray(error.detail) && error.detail.length > 0) {
    const primero = error.detail[0] as { msg?: string };
    if (primero?.msg) return primero.msg;
  }
  if (typeof error.mensaje === 'string') return error.mensaje;
  if (typeof error.message === 'string') return error.message;
  if (status === 403) return 'No tienes permiso para realizar esta acci?n.';
  if (status === 401) return 'Sesi?n inv?lida o expirada.';
  return `Error del servidor (${status})`;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { requiresAuth = false, headers: customHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((customHeaders as Record<string, string>) || {}),
  };

  if (requiresAuth) {
    const token = obtenerTokenSesion();
    if (!token) {
      throw new ErrorApi('No hay sesi?n activa. Inicia sesi?n.', 401);
    }
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers,
    ...rest,
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const mensaje = extraerMensajeError(error, response.status);

    if (response.status === 401) {
      limpiarSesionLocal();
      manejador401?.();
      throw new ErrorApi(mensaje, 401, error);
    }

    if (response.status === 403) {
      throw new ErrorApi(mensaje, 403, error);
    }

    throw new ErrorApi(mensaje, response.status, error);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

interface OpcionesSubida extends Omit<RequestInit, 'body'> {
  requiresAuth?: boolean;
}

export async function apiSubirArchivo<T>(
  endpoint: string,
  campoArchivo: string,
  archivo: File,
  camposExtra?: Record<string, string>,
  options: OpcionesSubida = {},
): Promise<T> {
  const { requiresAuth = false, headers: customHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    ...((customHeaders as Record<string, string>) || {}),
  };

  if (requiresAuth) {
    const token = obtenerTokenSesion();
    if (!token) {
      throw new ErrorApi('No hay sesi?n activa. Inicia sesi?n.', 401);
    }
    headers.Authorization = `Bearer ${token}`;
  }

  const formData = new FormData();
  formData.append(campoArchivo, archivo);
  if (camposExtra) {
    for (const [clave, valor] of Object.entries(camposExtra)) {
      formData.append(clave, valor);
    }
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: formData,
    ...rest,
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const mensaje = extraerMensajeError(error, response.status);

    if (response.status === 401) {
      limpiarSesionLocal();
      manejador401?.();
      throw new ErrorApi(mensaje, 401, error);
    }

    if (response.status === 403) {
      throw new ErrorApi(mensaje, 403, error);
    }

    throw new ErrorApi(mensaje, response.status, error);
  }

  return response.json();
}

export default apiRequest;
