/**
 * Tipado para el usuario administrador o cliente.
 */
export interface UsuarioAdmin {
  id: string;
  nombre: string;
  email: string;
  rol: 'admin' | 'editor' | 'client';
  avatar?: string;
  creadoEn: string;
  ultimoAcceso?: string;
}

/**
 * Tipado para la respuesta de autenticación.
 */
export interface RespuestaAutenticacion {
  token: string;
  usuario: UsuarioAdmin;
}

/**
 * Tipado para las credenciales de login.
 */
export interface CredencialesAcceso {
  email: string;
  contrasena: string;
}
