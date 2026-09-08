/**
 * autenticacion.ts — Login y sesión contra la API.
 */

import apiRequest, { guardarTokenSesion, limpiarSesionLocal, obtenerTokenSesion } from './api';
import type { SesionUsuario } from '../types/seguridad';
import { tienePermisoEnLista } from '../utils/permisosModulos';

interface RespuestaLoginApi {
  mensaje: string;
  token: string;
  tipo_token?: string;
  expira_en_segundos?: number;
  usuario: SesionUsuario;
}

interface RespuestaPerfilApi {
  mensaje: string;
  usuario: SesionUsuario;
}

export function guardarUsuarioSesion(usuario: SesionUsuario): void {
  localStorage.setItem('auth_usuario', JSON.stringify(usuario));
}

export function obtenerUsuarioSesion(): SesionUsuario | null {
  const raw = localStorage.getItem('auth_usuario');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SesionUsuario;
  } catch {
    return null;
  }
}

export function usuarioTienePermiso(usuario: SesionUsuario | null, permiso: string): boolean {
  return tienePermisoEnLista(usuario?.permisos ?? [], permiso);
}

export async function iniciarSesion(
  correo: string,
  contrasena: string
): Promise<{ token: string; usuario: SesionUsuario }> {
  limpiarSesionLocal();

  const response = await apiRequest<RespuestaLoginApi>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ correo, contrasena }),
  });

  if (!response?.token) {
    throw new Error('El servidor no devolvió un token de sesión');
  }

  guardarTokenSesion(response.token);
  guardarUsuarioSesion(response.usuario);

  return {
    token: response.token,
    usuario: response.usuario,
  };
}

export async function validarToken(): Promise<SesionUsuario> {
  if (!obtenerTokenSesion()) {
    throw new Error('No hay sesión activa');
  }

  const response = await apiRequest<RespuestaPerfilApi>('/auth/perfil', {
    requiresAuth: true,
  });

  guardarUsuarioSesion(response.usuario);
  return response.usuario;
}

interface RespuestaRegistroApi {
  mensaje: string;
  ficha_vinculada?: boolean;
  token: string;
  tipo_token?: string;
  expira_en_segundos?: number;
  usuario: SesionUsuario;
}

import type { PuntoRecogidaInline } from '../types/puntoRecogida';

export interface DatosRegistroCliente {
  nombre: string;
  apellido: string;
  correo: string;
  contrasena: string;
  tipo_cliente?: 'natural' | 'juridico';
  tipo_documento: string;
  numero_documento: string;
  razon_social?: string | null;
  telefono?: string;
  telefono_secundario?: string | null;
  direccion?: string | null;
  estado_id?: number;
  ciudad_id?: number;
  punto_recogida_ids?: number[];
  puntos_recogida?: PuntoRecogidaInline[];
}

export async function registrarCliente(
  datos: DatosRegistroCliente,
): Promise<{ token: string; usuario: SesionUsuario; fichaVinculada: boolean; mensaje: string }> {
  limpiarSesionLocal();

  const response = await apiRequest<RespuestaRegistroApi>('/auth/registro', {
    method: 'POST',
    body: JSON.stringify({
      tipo_cliente: 'natural',
      ...datos,
    }),
  });

  if (!response?.token) {
    throw new Error('El servidor no devolvió un token de sesión');
  }

  guardarTokenSesion(response.token);
  guardarUsuarioSesion(response.usuario);

  return {
    token: response.token,
    usuario: response.usuario,
    fichaVinculada: Boolean(response.ficha_vinculada),
    mensaje: response.mensaje,
  };
}

export async function cambiarMiContrasena(
  contrasenaActual: string,
  contrasenaNueva: string,
): Promise<void> {
  await apiRequest<{ mensaje: string }>('/usuarios/mi-contrasena', {
    method: 'PUT',
    requiresAuth: true,
    body: JSON.stringify({
      contrasena_actual: contrasenaActual,
      contrasena_nueva: contrasenaNueva,
    }),
  });
}

export function cerrarSesion(): void {
  limpiarSesionLocal();
}

/** Alias para compatibilidad con código existente. */
export const iniciarSesionAdmin = iniciarSesion;
export const cerrarSesionAdmin = cerrarSesion;
