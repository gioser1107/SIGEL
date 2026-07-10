import { useEffect, useState } from 'react';
import { PanelDeslizable } from '../../../../../components/admin';
import Boton from '../../../../../components/ui/Boton/Boton';
import { editarTasa } from '../../../../../services/tasas';
import type { Moneda, TasaCambio } from '../../../../../types/pagos';
import FormularioTasaCampos from '../components/FormularioTasaCampos';
import { formTasaVacio, tasaAFormulario, validarFormularioTasa, type FormularioTasa } from '../constants';
import { mensajeError } from '../../utils/mensajeError';

interface PanelEditarTasaProps {
  abierto: boolean;
  tasa: TasaCambio | null;
  monedas: Moneda[];
  onCerrar: () => void;
  onExito: (mensaje: string) => void;
  onError: (mensaje: string) => void;
  onRecargar: () => Promise<void>;
}

export default function PanelEditarTasa({
  abierto,
  tasa,
  monedas,
  onCerrar,
  onExito,
  onError,
  onRecargar,
}: PanelEditarTasaProps) {
  const [form, setForm] = useState<FormularioTasa>(formTasaVacio(monedas));
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (abierto && tasa) setForm(tasaAFormulario(tasa));
  }, [abierto, tasa]);

  async function guardar() {
    if (!tasa) return;
    const errorValidacion = validarFormularioTasa(form);
    if (errorValidacion) {
      onError(errorValidacion);
      return;
    }

    setGuardando(true);
    try {
      await editarTasa(tasa.id, {
        fecha: form.fecha,
        valor: Number(form.valor),
        moneda_id: Number(form.moneda_id),
      });
      onExito('Tasa actualizada.');
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
      titulo="Editar tasa"
      subtitulo="Valor = cuántos Bs equivalen a 1 unidad de la moneda seleccionada"
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
