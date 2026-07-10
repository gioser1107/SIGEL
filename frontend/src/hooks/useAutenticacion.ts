/**
 * useAutenticacion — Hook para acceder al estado de sesión global.
 */

import { useAutenticacionContext } from '../context/Autenticacion';
import { ErrorApi } from '../services/api';
import { puedeAccederPanelAdmin } from '../utils/permisosModulos';

export default function useAutenticacion() {
  const ctx = useAutenticacionContext();

  const iniciarSesion = async (correo: string, contrasena: string) => {
    try {
      const usuario = await ctx.iniciarSesion(correo, contrasena);
      const esPanelAdmin = puedeAccederPanelAdmin(usuario.permisos, ctx.esAdmin, usuario.rol);
      return {
        success: true as const,
        esPanelAdmin,
        usuario,
      };
    } catch (error) {
      console.error('Login fallido', error);
      const mensaje =
        error instanceof ErrorApi || error instanceof Error
          ? error.message
          : 'Credenciales incorrectas.';
      return { success: false as const, mensaje };
    }
  };

  return {
    estaAutenticado: ctx.estaAutenticado,
    estaCargando: ctx.estaCargando,
    usuario: ctx.usuario,
    tienePermiso: ctx.tienePermiso,
    puedeModulo: ctx.puedeModulo,
    puedeLeer: ctx.puedeLeer,
    puedeCrear: ctx.puedeCrear,
    puedeEditar: ctx.puedeEditar,
    puedeBorrar: ctx.puedeBorrar,
    puedeAccederSeguridad: ctx.puedeAccederSeguridad,
    esAdmin: ctx.esAdmin,
    iniciarSesion,
    cerrarSesion: ctx.cerrarSesion,
  };
}
