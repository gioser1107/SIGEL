import { useEffect, useState } from 'react';
import { PanelDeslizable } from '../../../../../components/admin';
import Boton from '../../../../../components/ui/Boton/Boton';
import { editarMoneda } from '../../../../../services/monedas';
import type { Moneda } from '../../../../../types/pagos';
import FormularioMonedaCampos from '../components/FormularioMonedaCampos';
import { FORM_MONEDA_VACIO, monedaAFormulario, validarFormularioMoneda, type FormularioMoneda } from '../constants';
import { mensajeError } from '../../utils/mensajeError';

interface PanelEditarMonedaProps {
  abierto: boolean;
  moneda: Moneda | null;
  onCerrar: () => void;
  onExito: (mensaje: string) => void;
  onError: (mensaje: string) => void;
  onRecargar: () => Promise<void>;
}

export default function PanelEditarMoneda({
  abierto,
  moneda,
  onCerrar,
  onExito,
  onError,
  onRecargar,
}: PanelEditarMonedaProps) {
  const [form, setForm] = useState<FormularioMoneda>(FORM_MONEDA_VACIO);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (abierto && moneda) setForm(monedaAFormulario(moneda));
  }, [abierto, moneda]);

  async function guardar() {
    if (!moneda) return;
    const errorValidacion = validarFormularioMoneda(form);
    if (errorValidacion) {
      onError(errorValidacion);
      return;
    }

    setGuardando(true);
    try {
      await editarMoneda(moneda.id, {
        codigo: form.codigo.trim(),
        nombre: form.nombre.trim(),
        simbolo: form.simbolo.trim(),
      });
      onExito('Moneda actualizada.');
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
      titulo="Editar moneda"
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
