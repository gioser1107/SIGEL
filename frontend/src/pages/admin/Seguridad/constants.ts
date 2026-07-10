import type { SeccionSeguridad } from '../../../types/seguridad';

export const MODULOS_SEGURIDAD = {
  usuarios: 'usuarios',
  roles: 'roles',
  permisos: 'permisos',
} as const;

export interface FormularioUsuario {
  nombre: string;
  apellido: string;
  correo: string;
  telefono_codigo: string;
  telefono_numero: string;
  contrasena: string;
  rol_id: string;
}

export interface FormularioRol {
  nombre: string;
  descripcion: string;
}

export interface FormularioPermiso {
  descripcion: string;
}

export const FORM_USUARIO_VACIO: FormularioUsuario = {
  nombre: '',
  apellido: '',
  correo: '',
  telefono_codigo: '',
  telefono_numero: '',
  contrasena: '',
  rol_id: '',
};

export const FORM_ROL_VACIO: FormularioRol = {
  nombre: '',
  descripcion: '',
};

export const FORM_PERMISO_VACIO: FormularioPermiso = {
  descripcion: '',
};

export const ETIQUETAS_SECCION: Record<SeccionSeguridad, string> = {
  usuarios: 'Usuarios',
  roles: 'Roles y permisos',
  permisos: 'Permisos',
};
