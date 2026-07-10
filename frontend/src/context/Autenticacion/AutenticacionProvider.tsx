import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { obtenerTokenSesion, registrarManejador401 } from '../../services/api';
import {
  cerrarSesion,
  iniciarSesion,
  obtenerUsuarioSesion,
  validarToken,
} from '../../services/autenticacion';
import type { SesionUsuario } from '../../types/seguridad';
import type { AccionPermiso } from '../../utils/permisosModulos';
import {
  puedeAccederSeguridad,
  puedeBorrar,
  puedeCrear,
  puedeEditar,
  puedeLeer,
  puedeModulo,
  tienePermisoEnLista,
} from '../../utils/permisosModulos';
import { AutenticacionContext } from './AutenticacionContext';

export function AutenticacionProvider({ children }: { children: ReactNode }) {
  const navegar = useNavigate();
  const [estaCargando, setEstaCargando] = useState(true);
  const [usuario, setUsuario] = useState<SesionUsuario | null>(null);

  const manejarCierreSesion = useCallback(() => {
    cerrarSesion();
    setUsuario(null);
    navegar('/iniciar-sesion', { replace: true });
  }, [navegar]);

  useEffect(() => {
    registrarManejador401(manejarCierreSesion);
  }, [manejarCierreSesion]);

  useEffect(() => {
    const verificar = async () => {
      if (!obtenerTokenSesion()) {
        setEstaCargando(false);
        return;
      }

      const cache = obtenerUsuarioSesion();
      if (cache) setUsuario(cache);

      try {
        const perfil = await validarToken();
        setUsuario(perfil);
      } catch {
        cerrarSesion();
        setUsuario(null);
      } finally {
        setEstaCargando(false);
      }
    };
    verificar();
  }, []);

  const iniciar = useCallback(async (correo: string, contrasena: string) => {
    const res = await iniciarSesion(correo, contrasena);
    setUsuario(res.usuario);
    return res.usuario;
  }, []);

  const establecerSesionTrasRegistro = useCallback((u: SesionUsuario) => {
    setUsuario(u);
  }, []);

  const salir = useCallback(() => {
    manejarCierreSesion();
  }, [manejarCierreSesion]);

  const permisos = useMemo(() => usuario?.permisos ?? [], [usuario]);

  const tienePermiso = useCallback(
    (permiso: string) => tienePermisoEnLista(permisos, permiso),
    [permisos]
  );

  const puedeModuloFn = useCallback(
    (modulo: string, accion?: AccionPermiso) => puedeModulo(permisos, modulo, accion),
    [permisos]
  );

  const puedeLeerFn = useCallback(
    (modulo: string) => puedeLeer(permisos, modulo),
    [permisos]
  );

  const puedeCrearFn = useCallback(
    (modulo: string) => puedeCrear(permisos, modulo),
    [permisos]
  );

  const puedeEditarFn = useCallback(
    (modulo: string) => puedeEditar(permisos, modulo),
    [permisos]
  );

  const puedeBorrarFn = useCallback(
    (modulo: string) => puedeBorrar(permisos, modulo),
    [permisos]
  );

  const puedeAccederSeguridadFn = useCallback(
    () => puedeAccederSeguridad(permisos),
    [permisos]
  );

  const esAdmin = useMemo(
    () => usuario?.rol?.toLowerCase().includes('admin') ?? false,
    [usuario]
  );

  const valor = useMemo(
    () => ({
      estaAutenticado: Boolean(usuario),
      estaCargando,
      usuario,
      iniciarSesion: iniciar,
      establecerSesionTrasRegistro,
      cerrarSesion: salir,
      tienePermiso,
      puedeModulo: puedeModuloFn,
      puedeLeer: puedeLeerFn,
      puedeCrear: puedeCrearFn,
      puedeEditar: puedeEditarFn,
      puedeBorrar: puedeBorrarFn,
      puedeAccederSeguridad: puedeAccederSeguridadFn,
      esAdmin,
    }),
    [
      usuario,
      estaCargando,
      iniciar,
      establecerSesionTrasRegistro,
      salir,
      tienePermiso,
      puedeModuloFn,
      puedeLeerFn,
      puedeCrearFn,
      puedeEditarFn,
      puedeBorrarFn,
      puedeAccederSeguridadFn,
      esAdmin,
    ]
  );

  return (
    <AutenticacionContext.Provider value={valor}>
      {children}
    </AutenticacionContext.Provider>
  );
}
