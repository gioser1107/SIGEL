import { useEffect, useState } from 'react';
import { PanelDeslizable } from '../../../../../components/admin';
import Boton from '../../../../../components/ui/Boton/Boton';
import { crearMetodoPago } from '../../../../../services/metodosPago';
import type { Moneda } from '../../../../../types/pagos';
import FormularioMetodoPagoCampos from '../components/FormularioMetodoPagoCampos';
import { FORM_METODO_PAGO_VACIO, validarFormularioMetodoPago, type FormularioMetodoPago } from '../constants';
import { mensajeError } from '../../utils/mensajeError';

interface PanelCrearMetodoPagoProps {
  abierto: boolean;
  monedas: Moneda[];
  onCerrar: () => void;
  onExito: (mensaje: string) => void;
  onError: (mensaje: string) => void;
  onRecargar: () => Promise<void>;
}

export default function PanelCrearMetodoPago({
  abierto,
  monedas,
  onCerrar,
  onExito,
  onError,
  onRecargar,
}: PanelCrearMetodoPagoProps) {
  const [form, setForm] = useState<FormularioMetodoPago>(FORM_METODO_PAGO_VACIO);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (abierto) setForm(FORM_METODO_PAGO_VACIO);
  }, [abierto]);

  async function guardar() {
    const errorValidacion = validarFormularioMetodoPago(form);
    if (errorValidacion) {
      onError(errorValidacion);
      return;
    }

    setGuardando(true);
    try {
      await crearMetodoPago({
        codigo: form.codigo.trim(),
        nombre: form.nombre.trim(),
        moneda_id: Number(form.moneda_id),
      });
      onExito('Método de pago creado.');
      onCerrar();
      await onRecargar();
    } catch (err) {
      onError(mensajeError(err, 'métodos de pago'));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <PanelDeslizable
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Nuevo método de pago"
      pie={
        <>
          <Boton variante="secundario" tamano="sm" onClick={onCerrar} disabled={guardando}>Cancelar</Boton>
          <Boton variante="primario" tamano="sm" onClick={guardar} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </Boton>
        </>
      }
    >
      <FormularioMetodoPagoCampos form={form} monedas={monedas} onChange={setForm} />
    </PanelDeslizable>
  );
}
