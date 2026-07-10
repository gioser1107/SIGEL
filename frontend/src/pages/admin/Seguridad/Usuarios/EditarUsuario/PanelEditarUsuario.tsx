import { useEffect, useState } from 'react';
import { PanelDeslizable } from '../../../../../components/admin';
import Boton from '../../../../../components/ui/Boton/Boton';
import {
  cambiarRolUsuario,
  editarUsuario,
  resetearContrasenaUsuario,
} from '../../../../../services/seguridad';
import type { Rol, UsuarioSistema } from '../../../../../types/seguridad';
import {
  armarTelefonoVe,
  tieneErrores,
  validarFormularioUsuario,
  type ErroresFormularioUsuario,
} from '../../../../../utils/validacionesFormulario';
import FormularioUsuarioCampos from '../../components/FormularioUsuarioCampos';
import { FORM_USUARIO_VACIO, type FormularioUsuario } from '../../constants';
import { usuarioAFormulario } from '../../utils/mapeoUsuario';
import { mensajeError } from '../../utils/mensajeError';
import './PanelEditarUsuario.css';

interface PanelEditarUsuarioProps {
  abierto: boolean;
  usuario: UsuarioSistema | null;
  roles: Rol[];
  onCerrar: () => void;
  onExito: (mensaje: string) => void;
  onError: (mensaje: string) => void;
  onRecargar: () => Promise<void>;
}

export default function PanelEditarUsuario({
  abierto,
  usuario,
  roles,
  onCerrar,
  onExito,
  onError,
  onRecargar,
}: PanelEditarUsuarioProps) {
  const [form, setForm] = useState<FormularioUsuario>(FORM_USUARIO_VACIO);
  const [erroresForm, setErroresForm] = useState<ErroresFormularioUsuario>({});
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (abierto && usuario) {
      setForm(usuarioAFormulario(usuario));
      setErroresForm({});
    }
  }, [abierto, usuario]);

  async function guardar() {
    if (!usuario) return;

    const errores = validarFormularioUsuario(form, 'editar');
    if (tieneErrores(errores)) {
      setErroresForm(errores);
      return;
    }

    setErroresForm({});
    setGuardando(true);

    try {
      const telefono = armarTelefonoVe(form.telefono_codigo, form.telefono_numero);
      await editarUsuario(usuario.id, {
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        correo: form.correo.trim(),
        telefono: telefono ?? null,
      });

      if (form.rol_id && Number(form.rol_id) !== usuario.rol_id) {
        await cambiarRolUsuario(usuario.id, Number(form.rol_id));
      }
      if (form.contrasena) {
        await resetearContrasenaUsuario(usuario.id, form.contrasena);
      }

      onExito('Usuario actualizado correctamente.');
      onCerrar();
      await onRecargar();
    } catch (err) {
      onError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  }

  function limpiarError(campo: keyof ErroresFormularioUsuario) {
    setErroresForm((prev) => ({ ...prev, [campo]: undefined }));
  }

  return (
    <PanelDeslizable
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Editar usuario"
      subtitulo="Datos de acceso y rol asignado"
      ancho="md"
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
      <FormularioUsuarioCampos
        form={form}
        erroresForm={erroresForm}
        roles={roles}
        modo="editar"
        onChange={setForm}
        onLimpiarError={limpiarError}
      />
    </PanelDeslizable>
  );
}
