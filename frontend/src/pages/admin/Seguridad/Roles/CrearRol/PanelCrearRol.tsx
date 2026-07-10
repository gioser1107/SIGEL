import { useEffect, useState } from 'react';
import { PanelDeslizable } from '../../../../../components/admin';
import Boton from '../../../../../components/ui/Boton/Boton';
import { crearRol } from '../../../../../services/seguridad';
import type { Rol } from '../../../../../types/seguridad';
import FormularioRolCampos from '../../components/FormularioRolCampos';
import { FORM_ROL_VACIO, type FormularioRol } from '../../constants';
import { mensajeError } from '../../utils/mensajeError';
import { validarFormularioRol } from '../../../../../utils/validacionesFormulario';
import './PanelCrearRol.css';

interface PanelCrearRolProps {
  abierto: boolean;
  onCerrar: () => void;
  onCreado: (rol: Rol) => void;
  onExito: (mensaje: string) => void;
  onError: (mensaje: string) => void;
  onRecargar: () => Promise<void>;
}

export default function PanelCrearRol({
  abierto,
  onCerrar,
  onCreado,
  onExito,
  onError,
  onRecargar,
}: PanelCrearRolProps) {
  const [form, setForm] = useState<FormularioRol>(FORM_ROL_VACIO);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (abierto) setForm(FORM_ROL_VACIO);
  }, [abierto]);

  async function guardar() {
    const errorValidacion = validarFormularioRol(form);
    if (errorValidacion) {
      onError(errorValidacion);
      return;
    }
    setGuardando(true);
    try {
      const nuevo = await crearRol(form);
      onExito('Rol creado correctamente.');
      onCerrar();
      onCreado(nuevo);
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
      titulo="Nuevo rol"
      subtitulo="Nombre, descripción y permisos del panel"
      ancho="lg"
      pie={
        <>
          <Boton variante="secundario" tamano="sm" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Boton>
          <Boton variante="primario" tamano="sm" onClick={guardar} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Crear rol'}
          </Boton>
        </>
      }
    >
      <FormularioRolCampos
        form={form}
        permisos={[]}
        permisosSeleccionados={new Set()}
        mostrarMatriz={false}
        onChange={setForm}
        onAlternarPermiso={() => {}}
      />
    </PanelDeslizable>
  );
}
