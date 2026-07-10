import { useCallback, useEffect, useState } from 'react';
import { PanelDeslizable } from '../../../../components/admin';
import Boton from '../../../../components/ui/Boton/Boton';
import { crearCliente } from '../../../../services/clientes';
import {
  tieneErroresCliente,
  validarFormularioCliente,
  type ErroresFormularioCliente,
  type FormularioCliente,
} from '../../../../utils/validacionesCliente';
import FormularioClienteCampos from '../components/FormularioClienteCampos';
import PuntosRecogidaEditor from '../../../../components/puntos-recogida/PuntosRecogidaEditor';
import { draftAPayloadPuntos } from '../../../../components/puntos-recogida/utils';
import '../../../../components/puntos-recogida/puntos-recogida.css';
import type { PuntosRecogidaDraft } from '../../../../types/puntoRecogida';
import { PUNTOS_RECOGIDA_DRAFT_VACIO } from '../../../../types/puntoRecogida';
import { FORM_VACIO } from '../constants';
import useUbicacionesCliente from '../hooks/useUbicacionesCliente';
import { formularioAPayload } from '../utils/mapeoFormulario';
import { mensajeError } from '../utils/mensajeError';
import './PanelCrearCliente.css';

interface PanelCrearClienteProps {
  abierto: boolean;
  onCerrar: () => void;
  onExito: (mensaje: string) => void;
  onError: (mensaje: string) => void;
  onRecargar: () => Promise<void>;
}

export default function PanelCrearCliente({
  abierto,
  onCerrar,
  onExito,
  onError,
  onRecargar,
}: PanelCrearClienteProps) {
  const [form, setForm] = useState<FormularioCliente>(FORM_VACIO);
  const [puntosDraft, setPuntosDraft] = useState<PuntosRecogidaDraft>(PUNTOS_RECOGIDA_DRAFT_VACIO);
  const [erroresForm, setErroresForm] = useState<ErroresFormularioCliente>({});
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (abierto) {
      setForm(FORM_VACIO);
      setPuntosDraft(PUNTOS_RECOGIDA_DRAFT_VACIO);
      setErroresForm({});
    }
  }, [abierto]);

  const limpiarCiudad = useCallback(() => {
    setForm((f) => ({ ...f, ciudad_id: '' }));
  }, []);

  const { estados, ciudades, cargandoCiudades } = useUbicacionesCliente({
    panelAbierto: abierto,
    estadoId: form.estado_id,
    ciudadId: form.ciudad_id,
    onError,
    onCiudadInvalida: limpiarCiudad,
  });

  function cerrarPanel() {
    onCerrar();
  }

  async function guardar() {
    const errores = validarFormularioCliente(form);
    if (tieneErroresCliente(errores)) {
      setErroresForm(errores);
      return;
    }

    setErroresForm({});
    setGuardando(true);

    try {
      await crearCliente({
        ...formularioAPayload(form),
        ...draftAPayloadPuntos(puntosDraft),
      });
      onExito('Cliente registrado correctamente.');
      onCerrar();
      await onRecargar();
    } catch (err) {
      onError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  }

  function limpiarError(campo: keyof ErroresFormularioCliente) {
    setErroresForm((prev) => ({ ...prev, [campo]: undefined }));
  }

  return (
    <PanelDeslizable
      abierto={abierto}
      onCerrar={cerrarPanel}
      titulo="Nuevo cliente"
      ancho="lg"
      pie={
        <>
          <Boton variante="secundario" tamano="sm" onClick={cerrarPanel} disabled={guardando}>
            Cancelar
          </Boton>
          <Boton variante="primario" tamano="sm" onClick={guardar} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Registrar cliente'}
          </Boton>
        </>
      }
    >
      <FormularioClienteCampos
        form={form}
        erroresForm={erroresForm}
        estados={estados}
        ciudades={ciudades}
        cargandoCiudades={cargandoCiudades}
        onChange={setForm}
        onLimpiarError={limpiarError}
      />
      <PuntosRecogidaEditor
        mode="admin-create"
        value={puntosDraft}
        onChange={setPuntosDraft}
        onError={onError}
        colapsable
      />
    </PanelDeslizable>
  );
}
