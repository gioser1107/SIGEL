import { useEffect, useState } from 'react';
import { PanelDeslizable } from '../../../../../components/admin';
import Boton from '../../../../../components/ui/Boton/Boton';
import { crearUsuario } from '../../../../../services/seguridad';
import type { Rol } from '../../../../../types/seguridad';
import {
  armarTelefonoVe,
  tieneErrores,
  validarFormularioUsuario,
  type ErroresFormularioUsuario,
} from '../../../../../utils/validacionesFormulario';
import FormularioUsuarioCampos from '../../components/FormularioUsuarioCampos';
import { FORM_USUARIO_VACIO, type FormularioUsuario } from '../../constants';
import { mensajeError } from '../../utils/mensajeError';
import './PanelCrearUsuario.css';

interface PanelCrearUsuarioProps {
  abierto: boolean;
  roles: Rol[];
  onCerrar: () => void;
  onExito: (mensaje: string) => void;
  onError: (mensaje: string) => void;
  onRecargar: () => Promise<void>;
}

export default function PanelCrearUsuario({
  abierto,
  roles,
  onCerrar,
  onExito,
  onError,
  onRecargar,
}: PanelCrearUsuarioProps) {
  const [form, setForm] = useState<FormularioUsuario>(FORM_USUARIO_VACIO);
  const [erroresForm, setErroresForm] = useState<ErroresFormularioUsuario>({});
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (abierto) {
      setForm(FORM_USUARIO_VACIO);
      setErroresForm({});
    }
  }, [abierto]);

  async function guardar() {
    const errores = validarFormularioUsuario(form, 'crear');
    if (tieneErrores(errores)) {
      setErroresForm(errores);
      return;
    }

    setErroresForm({});
    setGuardando(true);

    try {
      const telefono = armarTelefonoVe(form.telefono_codigo, form.telefono_numero);
      await crearUsuario({
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        correo: form.correo.trim(),
        contrasena: form.contrasena,
        rol_id: Number(form.rol_id),
        telefono,
      });
      onExito('Usuario creado correctamente.');
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
      titulo="Nuevo usuario"
      subtitulo="Datos de acceso y rol asignado"
      ancho="md"
      pie={
        <>
          <Boton variante="secundario" tamano="sm" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Boton>
          <Boton variante="primario" tamano="sm" onClick={guardar} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Crear usuario'}
          </Boton>
        </>
      }
    >
      <FormularioUsuarioCampos
        form={form}
        erroresForm={erroresForm}
        roles={roles}
        modo="crear"
        onChange={setForm}
        onLimpiarError={limpiarError}
      />
    </PanelDeslizable>
  );
}
