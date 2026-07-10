import { useEffect, useState } from 'react';
import { PanelDeslizable } from '../../../../../components/admin';
import Boton from '../../../../../components/ui/Boton/Boton';
import { crearPermiso } from '../../../../../services/seguridad';
import FormularioPermisoCampos from '../../components/FormularioPermisoCampos';
import { FORM_PERMISO_VACIO, type FormularioPermiso } from '../../constants';
import { mensajeError } from '../../utils/mensajeError';
import { validarFormularioPermiso } from '../../../../../utils/validacionesFormulario';
import './PanelCrearPermiso.css';

interface PanelCrearPermisoProps {
  abierto: boolean;
  onCerrar: () => void;
  onExito: (mensaje: string) => void;
  onError: (mensaje: string) => void;
  onRecargar: () => Promise<void>;
}

export default function PanelCrearPermiso({
  abierto,
  onCerrar,
  onExito,
  onError,
  onRecargar,
}: PanelCrearPermisoProps) {
  const [form, setForm] = useState<FormularioPermiso>(FORM_PERMISO_VACIO);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (abierto) setForm(FORM_PERMISO_VACIO);
  }, [abierto]);

  async function guardar() {
    const errorValidacion = validarFormularioPermiso(form);
    if (errorValidacion) {
      onError(errorValidacion);
      return;
    }
    setGuardando(true);
    try {
      await crearPermiso(form);
      onExito('Permiso creado correctamente.');
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
      titulo="Nuevo permiso"
      ancho="md"
      pie={
        <>
          <Boton variante="secundario" tamano="sm" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Boton>
          <Boton variante="primario" tamano="sm" onClick={guardar} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Crear permiso'}
          </Boton>
        </>
      }
    >
      <FormularioPermisoCampos form={form} onChange={setForm} />
    </PanelDeslizable>
  );
}
