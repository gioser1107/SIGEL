import { useCallback, useEffect, useState } from 'react';
import { PanelDeslizable } from '../../../../components/admin';
import Boton from '../../../../components/ui/Boton/Boton';
import { editarCliente } from '../../../../services/clientes';
import type { Cliente } from '../../../../types/cliente';
import {
  tieneErroresCliente,
  validarFormularioCliente,
  type ErroresFormularioCliente,
  type FormularioCliente,
} from '../../../../utils/validacionesCliente';
import FormularioClienteCampos from '../components/FormularioClienteCampos';
import PuntosRecogidaEditor from '../../../../components/puntos-recogida/PuntosRecogidaEditor';
import '../../../../components/puntos-recogida/puntos-recogida.css';
import { FORM_VACIO } from '../constants';
import useUbicacionesCliente from '../hooks/useUbicacionesCliente';
import { clienteAFormulario, formularioAPayload } from '../utils/mapeoFormulario';
import { mensajeError } from '../utils/mensajeError';
import './PanelEditarCliente.css';

interface PanelEditarClienteProps {
  abierto: boolean;
  cliente: Cliente | null;
  onCerrar: () => void;
  onExito: (mensaje: string) => void;
  onError: (mensaje: string) => void;
  onRecargar: () => Promise<void>;
}

export default function PanelEditarCliente({
  abierto,
  cliente,
  onCerrar,
  onExito,
  onError,
  onRecargar,
}: PanelEditarClienteProps) {
  const [form, setForm] = useState<FormularioCliente>(FORM_VACIO);
  const [erroresForm, setErroresForm] = useState<ErroresFormularioCliente>({});
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (abierto && cliente) {
      setForm(clienteAFormulario(cliente));
      setErroresForm({});
    }
  }, [abierto, cliente]);

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

  async function guardar() {
    if (!cliente) return;

    const errores = validarFormularioCliente(form);
    if (tieneErroresCliente(errores)) {
      setErroresForm(errores);
      return;
    }

    setErroresForm({});
    setGuardando(true);

    try {
      await editarCliente(cliente.cliente_id, formularioAPayload(form));
      onExito('Cliente actualizado correctamente.');
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
      onCerrar={onCerrar}
      titulo="Editar cliente"
      subtitulo={cliente ? `${cliente.tipo_documento}-${cliente.numero_documento}` : undefined}
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
      <FormularioClienteCampos
        form={form}
        erroresForm={erroresForm}
        estados={estados}
        ciudades={ciudades}
        cargandoCiudades={cargandoCiudades}
        clienteActivo={cliente}
        onChange={setForm}
        onLimpiarError={limpiarError}
      />
      {cliente && (
        <PuntosRecogidaEditor
          mode="admin-edit"
          clienteId={cliente.cliente_id}
          onError={onError}
        />
      )}
    </PanelDeslizable>
  );
}
