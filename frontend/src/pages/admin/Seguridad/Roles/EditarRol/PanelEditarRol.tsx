import { useCallback, useEffect, useState } from 'react';
import { PanelDeslizable } from '../../../../../components/admin';
import Boton from '../../../../../components/ui/Boton/Boton';
import {
  asignarPermisoRol,
  editarRol,
  obtenerPermisosRol,
  quitarPermisoRol,
} from '../../../../../services/seguridad';
import type { Permiso, Rol } from '../../../../../types/seguridad';
import FormularioRolCampos from '../../components/FormularioRolCampos';
import { FORM_ROL_VACIO, type FormularioRol } from '../../constants';
import { mensajeError } from '../../utils/mensajeError';
import { validarFormularioRol } from '../../../../../utils/validacionesFormulario';
import './PanelEditarRol.css';

interface PanelEditarRolProps {
  abierto: boolean;
  rol: Rol | null;
  permisos: Permiso[];
  onCerrar: () => void;
  onExito: (mensaje: string) => void;
  onError: (mensaje: string) => void;
  onRecargar: () => Promise<void>;
}

export default function PanelEditarRol({
  abierto,
  rol,
  permisos,
  onCerrar,
  onExito,
  onError,
  onRecargar,
}: PanelEditarRolProps) {
  const [form, setForm] = useState<FormularioRol>(FORM_ROL_VACIO);
  const [permisosRol, setPermisosRol] = useState<Set<number>>(new Set());
  const [permisosRolIniciales, setPermisosRolIniciales] = useState<Set<number>>(new Set());
  const [guardando, setGuardando] = useState(false);

  const cargarPermisosRol = useCallback(async (rolId: number) => {
    try {
      const res = await obtenerPermisosRol(rolId);
      const ids = new Set(res.permisos.map((p) => p.permiso_id));
      setPermisosRol(ids);
      setPermisosRolIniciales(new Set(ids));
    } catch (err) {
      onError(mensajeError(err));
    }
  }, [onError]);

  useEffect(() => {
    if (abierto && rol) {
      setForm({ nombre: rol.nombre, descripcion: rol.descripcion });
      cargarPermisosRol(rol.id);
    }
  }, [abierto, rol, cargarPermisosRol]);

  function alternarPermisoLocal(permisoId: number) {
    setPermisosRol((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(permisoId)) nuevo.delete(permisoId);
      else nuevo.add(permisoId);
      return nuevo;
    });
  }

  async function sincronizarPermisosRol(rolId: number) {
    const paraAsignar = [...permisosRol].filter((id) => !permisosRolIniciales.has(id));
    const paraQuitar = [...permisosRolIniciales].filter((id) => !permisosRol.has(id));

    for (const permisoId of paraAsignar) {
      await asignarPermisoRol(rolId, permisoId);
    }
    for (const permisoId of paraQuitar) {
      await quitarPermisoRol(rolId, permisoId);
    }

    setPermisosRolIniciales(new Set(permisosRol));
  }

  async function guardar() {
    if (!rol) return;

    const errorValidacion = validarFormularioRol(form);
    if (errorValidacion) {
      onError(errorValidacion);
      return;
    }

    setGuardando(true);
    try {
      await editarRol(rol.id, form);
      await sincronizarPermisosRol(rol.id);
      onExito('Rol actualizado correctamente.');
      onCerrar();
      await onRecargar();
    } catch (err) {
      onError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <PanelDeslizable
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Editar rol"
      subtitulo="Nombre, descripción y permisos del panel"
      ancho="lg"
      pie={
        <>
          <Boton variante="secundario" tamano="sm" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Boton>
          <Boton variante="primario" tamano="sm" onClick={guardar} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </Boton>
        </>
      }
    >
      <FormularioRolCampos
        form={form}
        permisos={permisos}
        permisosSeleccionados={permisosRol}
        mostrarMatriz
        onChange={setForm}
        onAlternarPermiso={alternarPermisoLocal}
      />
    </PanelDeslizable>
  );
}
