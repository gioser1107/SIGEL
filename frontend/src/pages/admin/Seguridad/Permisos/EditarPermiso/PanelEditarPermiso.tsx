import { useEffect, useState } from 'react';
import { PanelDeslizable } from '../../../../../components/admin';
import Boton from '../../../../../components/ui/Boton/Boton';
import { editarPermiso } from '../../../../../services/seguridad';
import type { Permiso } from '../../../../../types/seguridad';
import FormularioPermisoCampos from '../../components/FormularioPermisoCampos';
import { FORM_PERMISO_VACIO, type FormularioPermiso } from '../../constants';
import { mensajeError } from '../../utils/mensajeError';
import { validarFormularioPermiso } from '../../../../../utils/validacionesFormulario';
import './PanelEditarPermiso.css';

interface PanelEditarPermisoProps {
  abierto: boolean;
  permiso: Permiso | null;
  onCerrar: () => void;
  onExito: (mensaje: string) => void;
  onError: (mensaje: string) => void;
  onRecargar: () => Promise<void>;
}

export default function PanelEditarPermiso({
  abierto,
  permiso,
  onCerrar,
  onExito,
  onError,
  onRecargar,
}: PanelEditarPermisoProps) {
  const [form, setForm] = useState<FormularioPermiso>(FORM_PERMISO_VACIO);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (abierto && permiso) {
      setForm({ descripcion: permiso.descripcion });
    }
  }, [abierto, permiso]);

  async function guardar() {
    if (!permiso) return;

    const errorValidacion = validarFormularioPermiso(form);
    if (errorValidacion) {
      onError(errorValidacion);
      return;
    }

    setGuardando(true);
    try {
      await editarPermiso(permiso.id, form);
      onExito('Permiso actualizado correctamente.');
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
      titulo="Editar permiso"
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
      <FormularioPermisoCampos form={form} onChange={setForm} />
    </PanelDeslizable>
  );
}
