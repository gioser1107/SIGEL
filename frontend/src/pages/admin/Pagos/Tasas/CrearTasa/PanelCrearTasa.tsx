import { useEffect, useState } from 'react';
import { PanelDeslizable } from '../../../../../components/admin';
import Boton from '../../../../../components/ui/Boton/Boton';
import { crearTasa } from '../../../../../services/tasas';
import type { Moneda } from '../../../../../types/pagos';
import FormularioTasaCampos from '../components/FormularioTasaCampos';
import { formTasaVacio, validarFormularioTasa, type FormularioTasa } from '../constants';
import { mensajeError } from '../../utils/mensajeError';

interface PanelCrearTasaProps {
  abierto: boolean;
  monedas: Moneda[];
  fechaInicial?: string;
  onCerrar: () => void;
  onExito: (mensaje: string) => void;
  onError: (mensaje: string) => void;
  onRecargar: () => Promise<void>;
}

export default function PanelCrearTasa({
  abierto,
  monedas,
  fechaInicial,
  onCerrar,
  onExito,
  onError,
  onRecargar,
}: PanelCrearTasaProps) {
  const [form, setForm] = useState<FormularioTasa>(formTasaVacio(monedas));
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (abierto) setForm(formTasaVacio(monedas, fechaInicial));
  }, [abierto, monedas, fechaInicial]);

  async function guardar() {
    const errorValidacion = validarFormularioTasa(form);
    if (errorValidacion) {
      onError(errorValidacion);
      return;
    }

    setGuardando(true);
    try {
      await crearTasa({
        fecha: form.fecha,
        valor: Number(form.valor),
        moneda_id: Number(form.moneda_id),
      });
      onExito('Tasa registrada.');
      onCerrar();
      await onRecargar();
    } catch (err) {
      onError(mensajeError(err, 'tasas'));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <PanelDeslizable
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Registrar tasa a mano"
      subtitulo="Úsala si el BCV no responde o quieres un valor distinto. Bs por 1 unidad de la moneda."
      pie={
        <>
          <Boton variante="secundario" tamano="sm" onClick={onCerrar} disabled={guardando}>Cancelar</Boton>
          <Boton variante="primario" tamano="sm" onClick={guardar} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </Boton>
        </>
      }
    >
      <FormularioTasaCampos form={form} monedas={monedas} onChange={setForm} />
    </PanelDeslizable>
  );
}
