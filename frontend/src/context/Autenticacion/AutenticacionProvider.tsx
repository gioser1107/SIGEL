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
  esRolAdministrador,
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

  const iniciar = useCallback(async (
    correo: string,
    contrasena: string,
    captcha: { captcha_token: string; captcha_respuesta: string },
  ) => {
    const res = await iniciarSesion(correo, contrasena, captcha);
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

  const esAdmin = useMemo(
    () => esRolAdministrador(usuario?.rol),
    [usuario]
  );

  const tienePermiso = useCallback(
    (permiso: string) => esAdmin || tienePermisoEnLista(permisos, permiso),
    [esAdmin, permisos]
  );

  const puedeModuloFn = useCallback(
    (modulo: string, accion?: AccionPermiso) => esAdmin || puedeModulo(permisos, modulo, accion),
    [esAdmin, permisos]
  );

  const puedeLeerFn = useCallback(
    (modulo: string) => esAdmin || puedeLeer(permisos, modulo),
    [esAdmin, permisos]
  );

  const puedeCrearFn = useCallback(
    (modulo: string) => esAdmin || puedeCrear(permisos, modulo),
    [esAdmin, permisos]
  );

  const puedeEditarFn = useCallback(
    (modulo: string) => esAdmin || puedeEditar(permisos, modulo),
    [esAdmin, permisos]
  );

  const puedeBorrarFn = useCallback(
    (modulo: string) => esAdmin || puedeBorrar(permisos, modulo),
    [esAdmin, permisos]
  );

  const puedeAccederSeguridadFn = useCallback(
    () => esAdmin || puedeAccederSeguridad(permisos),
    [esAdmin, permisos]
  );

  const esCliente = useMemo(
    () =>
      (usuario?.rol?.trim().toLowerCase() === 'cliente') &&
      usuario?.cliente_id != null,
    [usuario],
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
      esCliente,
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
      esCliente,
    ]
  );

  return (
    <AutenticacionContext.Provider value={valor}>
      {children}
    </AutenticacionContext.Provider>
  );
}
