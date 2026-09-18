import { createContext, useContext } from 'react';
import type { CredencialesCaptcha } from '../../services/autenticacion';
import type { SesionUsuario } from '../../types/seguridad';
import type { AccionPermiso } from '../../utils/permisosModulos';

export interface AutenticacionContextValue {
  estaAutenticado: boolean;
  estaCargando: boolean;
  usuario: SesionUsuario | null;
  iniciarSesion: (correo: string, contrasena: string, captcha: CredencialesCaptcha) => Promise<SesionUsuario>;
  establecerSesionTrasRegistro: (usuario: SesionUsuario) => void;
  cerrarSesion: () => void;
  tienePermiso: (permiso: string) => boolean;
  puedeModulo: (modulo: string, accion?: AccionPermiso) => boolean;
  puedeLeer: (modulo: string) => boolean;
  puedeCrear: (modulo: string) => boolean;
  puedeEditar: (modulo: string) => boolean;
  puedeBorrar: (modulo: string) => boolean;
  puedeAccederSeguridad: () => boolean;
  esAdmin: boolean;
  esCliente: boolean;
}

export const AutenticacionContext = createContext<AutenticacionContextValue | null>(null);

export function useAutenticacionContext(): AutenticacionContextValue {
  const ctx = useContext(AutenticacionContext);
  if (!ctx) {
    throw new Error('useAutenticacionContext debe usarse dentro de AutenticacionProvider');
  }
  return ctx;
}
