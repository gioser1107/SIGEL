import { useCallback, useEffect, useState } from 'react';
import { listarPermisos, listarRoles, listarUsuarios } from '../../../../services/seguridad';
import type { Permiso, Rol, SeccionSeguridad, UsuarioSistema } from '../../../../types/seguridad';
import { LIMITE_PAGINA_MAX } from '../../../../types/paginacion';
import { MODULOS_SEGURIDAD } from '../constants';
import { mensajeError } from '../utils/mensajeError';

interface UseDatosSeguridadOptions {
  puedeLeer: (modulo: string) => boolean;
  onError: (mensaje: string) => void;
  seccion: SeccionSeguridad;
  pagina: number;
  limite: number;
  setTotal: (total: number) => void;
}

export default function useDatosSeguridad({
  puedeLeer,
  onError,
  seccion,
  pagina,
  limite,
  setTotal,
}: UseDatosSeguridadOptions) {
  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [rolesCatalogo, setRolesCatalogo] = useState<Rol[]>([]);
  const [permisosCatalogo, setPermisosCatalogo] = useState<Permiso[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const tareas: Promise<void>[] = [];

      if (puedeLeer(MODULOS_SEGURIDAD.usuarios)) {
        if (seccion === 'usuarios') {
          tareas.push(
            listarUsuarios({ pagina, limite }).then((respuesta) => {
              setUsuarios(respuesta.items);
              setTotal(respuesta.total);
            }),
          );
        }
        if (puedeLeer(MODULOS_SEGURIDAD.roles)) {
          tareas.push(
            listarRoles({ pagina: 1, limite: LIMITE_PAGINA_MAX }).then((respuesta) => {
              setRolesCatalogo(respuesta.items);
            }),
          );
        }
      }

      if (puedeLeer(MODULOS_SEGURIDAD.roles)) {
        if (seccion === 'roles') {
          tareas.push(
            listarRoles({ pagina, limite }).then((respuesta) => {
              setRoles(respuesta.items);
              setTotal(respuesta.total);
            }),
          );
        }
        if (puedeLeer(MODULOS_SEGURIDAD.permisos)) {
          tareas.push(
            listarPermisos({ pagina: 1, limite: LIMITE_PAGINA_MAX }).then((respuesta) => {
              setPermisosCatalogo(respuesta.items);
            }),
          );
        }
      }

      if (puedeLeer(MODULOS_SEGURIDAD.permisos) && seccion === 'permisos') {
        tareas.push(
          listarPermisos({ pagina, limite }).then((respuesta) => {
            setPermisos(respuesta.items);
            setTotal(respuesta.total);
          }),
        );
      }

      await Promise.all(tareas);
    } catch (err) {
      onError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  }, [puedeLeer, onError, seccion, pagina, limite, setTotal]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  return {
    usuarios,
    roles,
    permisos,
    rolesCatalogo,
    permisosCatalogo,
    cargando,
    cargarDatos,
  };
}
