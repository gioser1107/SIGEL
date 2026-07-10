import { useEffect, useState } from 'react';
import { PanelDeslizable } from '../../../../../components/admin';
import Boton from '../../../../../components/ui/Boton/Boton';
import { crearPuntoVenta } from '../../../../../services/puntosVenta';
import type { Banco } from '../../../../../types/pagos';
import FormularioPuntoVentaCampos from '../components/FormularioPuntoVentaCampos';
import { FORM_PUNTO_VENTA_VACIO, validarFormularioPuntoVenta, type FormularioPuntoVenta } from '../constants';
import { mensajeError } from '../../utils/mensajeError';

interface PanelCrearPuntoVentaProps {
  abierto: boolean;
  bancos: Banco[];
  onCerrar: () => void;
  onExito: (mensaje: string) => void;
  onError: (mensaje: string) => void;
  onRecargar: () => Promise<void>;
}

export default function PanelCrearPuntoVenta({
  abierto,
  bancos,
  onCerrar,
  onExito,
  onError,
  onRecargar,
}: PanelCrearPuntoVentaProps) {
  const [form, setForm] = useState<FormularioPuntoVenta>(FORM_PUNTO_VENTA_VACIO);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (abierto) setForm(FORM_PUNTO_VENTA_VACIO);
  }, [abierto]);

  async function guardar() {
    const errorValidacion = validarFormularioPuntoVenta(form);
    if (errorValidacion) {
      onError(errorValidacion);
      return;
    }

    setGuardando(true);
    try {
      await crearPuntoVenta({
        banco_id: Number(form.banco_id),
        codigo: form.codigo.trim(),
        nombre: form.nombre.trim(),
        numero_terminal: form.numero_terminal.trim(),
        activo: form.activo,
      });
      onExito('Punto de venta creado.');
      onCerrar();
      await onRecargar();
    } catch (err) {
      onError(mensajeError(err, 'puntos de venta'));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <PanelDeslizable
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Nuevo punto de venta"
      pie={
        <>
          <Boton variante="secundario" tamano="sm" onClick={onCerrar} disabled={guardando}>Cancelar</Boton>
          <Boton variante="primario" tamano="sm" onClick={guardar} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </Boton>
        </>
      }
    >
      <FormularioPuntoVentaCampos form={form} bancos={bancos} onChange={setForm} />
    </PanelDeslizable>
  );
}
