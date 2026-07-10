/**
 * Tipos del módulo de seguridad (usuarios, roles y permisos).
 */

export interface UsuarioSistema {
  id: number;
  rol_id: number;
  rol: string;
  correo: string;
  nombre: string;
  apellido: string;
  telefono: string | null;
  permisos?: string[];
}

export interface Rol {
  id: number;
  nombre: string;
  descripcion: string;
}

export interface Permiso {
  id: number;
  descripcion: string;
}

export interface PermisoRol {
  permiso_id: number;
  descripcion: string;
}

export interface SesionUsuario {
  id: number;
  rol_id: number;
  rol: string;
  correo: string;
  nombre: string;
  apellido: string;
  telefono: string | null;
  permisos: string[];
  cliente_id?: number | null;
}

export interface DatosUsuarioNuevo {
  nombre: string;
  apellido: string;
  correo: string;
  contrasena: string;
  rol_id: number;
  telefono?: string;
}

export interface DatosUsuarioEdicion {
  nombre?: string;
  apellido?: string;
  correo?: string;
  telefono?: string | null;
}

export interface DatosRolNuevo {
  nombre: string;
  descripcion: string;
}

export interface DatosRolEdicion {
  nombre?: string;
  descripcion?: string;
}

export interface DatosPermisoNuevo {
  descripcion: string;
}

export type SeccionSeguridad = 'usuarios' | 'roles' | 'permisos';
