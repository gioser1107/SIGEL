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
import { FORM_VACIO, PESTANIAS_PANEL } from '../constants';
import useUbicacionesCliente from '../hooks/useUbicacionesCliente';
import { clienteAFormulario, formularioAPayload } from '../utils/mapeoFormulario';
import { mensajeError } from '../utils/mensajeError';
import { nombreVisibleCliente } from '../utils/inicialesCliente';
import FichaCliente from './FichaCliente';
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
  const [tabActiva, setTabActiva] = useState('ficha');

  useEffect(() => {
    if (abierto && cliente) {
      setForm(clienteAFormulario(cliente));
      setErroresForm({});
      setTabActiva('ficha');
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

  const enFicha = tabActiva === 'ficha';

  return (
    <PanelDeslizable
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={cliente ? nombreVisibleCliente(cliente) : 'Cliente'}
      subtitulo={cliente ? `${cliente.tipo_documento}-${cliente.numero_documento}` : undefined}
      ancho="lg"
      pestanias={PESTANIAS_PANEL}
      pestaniaActiva={tabActiva}
      onPestaniaChange={setTabActiva}
      pie={
        enFicha ? (
          <>
            <Boton variante="secundario" tamano="sm" onClick={onCerrar}>
              Cerrar
            </Boton>
            <Boton variante="primario" tamano="sm" onClick={() => setTabActiva('editar')}>
              Editar datos
            </Boton>
          </>
        ) : (
          <>
            <Boton
              variante="secundario"
              tamano="sm"
              onClick={() => {
                if (cliente) setForm(clienteAFormulario(cliente));
                setErroresForm({});
                setTabActiva('ficha');
              }}
              disabled={guardando}
            >
              Volver a ficha
            </Boton>
            <Boton variante="primario" tamano="sm" onClick={guardar} disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar cambios'}
            </Boton>
          </>
        )
      }
    >
      {cliente && enFicha && <FichaCliente cliente={cliente} activa={abierto && enFicha} />}

      {!enFicha && (
        <>
          <FormularioClienteCampos
            form={form}
            erroresForm={erroresForm}
            estados={estados}
            ciudades={ciudades}
            cargandoCiudades={cargandoCiudades}
            clienteActivo={cliente}
            ocultarIntro
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
        </>
      )}
    </PanelDeslizable>
  );
}
