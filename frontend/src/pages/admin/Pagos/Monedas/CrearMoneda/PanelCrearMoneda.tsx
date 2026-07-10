import { useEffect, useState } from 'react';
import { PanelDeslizable } from '../../../../../components/admin';
import Boton from '../../../../../components/ui/Boton/Boton';
import { crearMoneda } from '../../../../../services/monedas';
import FormularioMonedaCampos from '../components/FormularioMonedaCampos';
import { FORM_MONEDA_VACIO, validarFormularioMoneda, type FormularioMoneda } from '../constants';
import { mensajeError } from '../../utils/mensajeError';

interface PanelCrearMonedaProps {
  abierto: boolean;
  onCerrar: () => void;
  onExito: (mensaje: string) => void;
  onError: (mensaje: string) => void;
  onRecargar: () => Promise<void>;
}

export default function PanelCrearMoneda({
  abierto,
  onCerrar,
  onExito,
  onError,
  onRecargar,
}: PanelCrearMonedaProps) {
  const [form, setForm] = useState<FormularioMoneda>(FORM_MONEDA_VACIO);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (abierto) setForm(FORM_MONEDA_VACIO);
  }, [abierto]);

  async function guardar() {
    const errorValidacion = validarFormularioMoneda(form);
    if (errorValidacion) {
      onError(errorValidacion);
      return;
    }

    setGuardando(true);
    try {
      await crearMoneda({
        codigo: form.codigo.trim(),
        nombre: form.nombre.trim(),
        simbolo: form.simbolo.trim(),
      });
      onExito('Moneda creada.');
      onCerrar();
      await onRecargar();
    } catch (err) {
      onError(mensajeError(err, 'monedas'));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <PanelDeslizable
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Nueva moneda"
      pie={
        <>
          <Boton variante="secundario" tamano="sm" onClick={onCerrar} disabled={guardando}>Cancelar</Boton>
          <Boton variante="primario" tamano="sm" onClick={guardar} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </Boton>
        </>
      }
    >
      <FormularioMonedaCampos form={form} onChange={setForm} />
    </PanelDeslizable>
  );
}
