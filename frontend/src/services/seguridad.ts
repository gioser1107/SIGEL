/**
 * seguridad.ts — CRUD de usuarios, roles y permisos.
 */

import apiRequest from './api';
import type { PaginacionQuery, RespuestaPaginada } from '../types/paginacion';
import { agregarPaginacionAParams, normalizarRespuestaPaginada } from '../utils/paginacionApi';
import type {
  DatosPermisoNuevo,
  DatosRolEdicion,
  DatosRolNuevo,
  DatosUsuarioEdicion,
  DatosUsuarioNuevo,
  Permiso,
  PermisoRol,
  Rol,
  UsuarioSistema,
} from '../types/seguridad';

// ─── Usuarios ───────────────────────────────────────────────────────────────

export async function listarUsuarios(query?: PaginacionQuery): Promise<RespuestaPaginada<UsuarioSistema>> {
  const params = agregarPaginacionAParams(new URLSearchParams(), query);
  const data = await apiRequest<unknown>(`/usuarios/?${params.toString()}`, { requiresAuth: true });
  return normalizarRespuestaPaginada<UsuarioSistema>(data, query?.limite);
}

export async function obtenerUsuario(usuarioId: number): Promise<UsuarioSistema> {
  const res = await apiRequest<{ usuario: UsuarioSistema }>(`/usuarios/${usuarioId}`, {
    requiresAuth: true,
  });
  return res.usuario;
}

export async function crearUsuario(datos: DatosUsuarioNuevo): Promise<UsuarioSistema> {
  const res = await apiRequest<{ mensaje: string; usuario: UsuarioSistema }>('/usuarios/', {
    method: 'POST',
    requiresAuth: true,
    body: JSON.stringify(datos),
  });
  return res.usuario;
}

export async function editarUsuario(
  usuarioId: number,
  datos: DatosUsuarioEdicion
): Promise<UsuarioSistema> {
  const res = await apiRequest<{ mensaje: string; usuario: UsuarioSistema }>(
    `/usuarios/${usuarioId}`,
    {
      method: 'PUT',
      requiresAuth: true,
      body: JSON.stringify(datos),
    }
  );
  return res.usuario;
}

export async function cambiarRolUsuario(
  usuarioId: number,
  rolId: number
): Promise<UsuarioSistema> {
  const res = await apiRequest<{ mensaje: string; usuario: UsuarioSistema }>(
    `/usuarios/${usuarioId}/rol`,
    {
      method: 'PUT',
      requiresAuth: true,
      body: JSON.stringify({ rol_id: rolId }),
    }
  );
  return res.usuario;
}

export async function resetearContrasenaUsuario(
  usuarioId: number,
  contrasenaNueva: string
): Promise<void> {
  await apiRequest(`/usuarios/${usuarioId}/contrasena`, {
    method: 'PUT',
    requiresAuth: true,
    body: JSON.stringify({ contrasena_nueva: contrasenaNueva }),
  });
}

export async function eliminarUsuario(usuarioId: number): Promise<void> {
  await apiRequest(`/usuarios/${usuarioId}`, {
    method: 'DELETE',
    requiresAuth: true,
  });
}

// ─── Roles ────────────────────────────────────────────────────────────────────

export async function listarRoles(query?: PaginacionQuery): Promise<RespuestaPaginada<Rol>> {
  const params = agregarPaginacionAParams(new URLSearchParams(), query);
  const data = await apiRequest<unknown>(`/roles/?${params.toString()}`, { requiresAuth: true });
  return normalizarRespuestaPaginada<Rol>(data, query?.limite);
}

export async function obtenerRol(rolId: number): Promise<Rol> {
  const res = await apiRequest<{ rol: Rol }>(`/roles/${rolId}`, { requiresAuth: true });
  return res.rol;
}

export async function crearRol(datos: DatosRolNuevo): Promise<Rol> {
  const res = await apiRequest<{ mensaje: string; rol: Rol }>('/roles/', {
    method: 'POST',
    requiresAuth: true,
    body: JSON.stringify(datos),
  });
  return res.rol;
}

export async function editarRol(rolId: number, datos: DatosRolEdicion): Promise<Rol> {
  const res = await apiRequest<{ mensaje: string; rol: Rol }>(`/roles/${rolId}`, {
    method: 'PUT',
    requiresAuth: true,
    body: JSON.stringify(datos),
  });
  return res.rol;
}

export async function eliminarRol(rolId: number): Promise<void> {
  await apiRequest(`/roles/${rolId}`, {
    method: 'DELETE',
    requiresAuth: true,
  });
}

export async function obtenerPermisosRol(rolId: number): Promise<{
  rol_id: number;
  rol: string;
  permisos: PermisoRol[];
}> {
  return apiRequest(`/roles/${rolId}/permisos`, { requiresAuth: true });
}

export async function asignarPermisoRol(rolId: number, permisoId: number): Promise<void> {
  await apiRequest(`/roles/${rolId}/permisos`, {
    method: 'POST',
    requiresAuth: true,
    body: JSON.stringify({ permiso_id: permisoId }),
  });
}

export async function quitarPermisoRol(rolId: number, permisoId: number): Promise<void> {
  await apiRequest(`/roles/${rolId}/permisos/${permisoId}`, {
    method: 'DELETE',
    requiresAuth: true,
  });
}

// ─── Permisos ─────────────────────────────────────────────────────────────────

export async function listarPermisos(query?: PaginacionQuery): Promise<RespuestaPaginada<Permiso>> {
  const params = agregarPaginacionAParams(new URLSearchParams(), query);
  const data = await apiRequest<unknown>(`/permisos/?${params.toString()}`, { requiresAuth: true });
  return normalizarRespuestaPaginada<Permiso>(data, query?.limite);
}

export async function obtenerPermiso(permisoId: number): Promise<Permiso> {
  const res = await apiRequest<{ permiso: Permiso }>(`/permisos/${permisoId}`, {
    requiresAuth: true,
  });
  return res.permiso;
}

export async function crearPermiso(datos: DatosPermisoNuevo): Promise<Permiso> {
  const res = await apiRequest<{ mensaje: string; permiso: Permiso }>('/permisos/', {
    method: 'POST',
    requiresAuth: true,
    body: JSON.stringify(datos),
  });
  return res.permiso;
}

export async function editarPermiso(
  permisoId: number,
  datos: DatosPermisoNuevo
): Promise<Permiso> {
  const res = await apiRequest<{ mensaje: string; permiso: Permiso }>(`/permisos/${permisoId}`, {
    method: 'PUT',
    requiresAuth: true,
    body: JSON.stringify(datos),
  });
  return res.permiso;
}

export async function eliminarPermiso(permisoId: number): Promise<void> {
  await apiRequest(`/permisos/${permisoId}`, {
    method: 'DELETE',
    requiresAuth: true,
  });
}
