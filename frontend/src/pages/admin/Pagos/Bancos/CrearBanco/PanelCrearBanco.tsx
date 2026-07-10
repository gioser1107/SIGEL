import { useEffect, useState } from 'react';
import { PanelDeslizable } from '../../../../../components/admin';
import Boton from '../../../../../components/ui/Boton/Boton';
import { crearBanco } from '../../../../../services/bancos';
import FormularioBancoCampos from '../components/FormularioBancoCampos';
import { FORM_BANCO_VACIO, validarFormularioBanco, type FormularioBanco } from '../constants';
import { mensajeError } from '../../utils/mensajeError';

interface PanelCrearBancoProps {
  abierto: boolean;
  onCerrar: () => void;
  onExito: (mensaje: string) => void;
  onError: (mensaje: string) => void;
  onRecargar: () => Promise<void>;
}

export default function PanelCrearBanco({
  abierto,
  onCerrar,
  onExito,
  onError,
  onRecargar,
}: PanelCrearBancoProps) {
  const [form, setForm] = useState<FormularioBanco>(FORM_BANCO_VACIO);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (abierto) setForm(FORM_BANCO_VACIO);
  }, [abierto]);

  async function guardar() {
    const errorValidacion = validarFormularioBanco(form);
    if (errorValidacion) {
      onError(errorValidacion);
      return;
    }

    setGuardando(true);
    try {
      await crearBanco({
        codigo: form.codigo.trim(),
        nombre: form.nombre.trim(),
        activo: form.activo,
      });
      onExito('Banco creado.');
      onCerrar();
      await onRecargar();
    } catch (err) {
      onError(mensajeError(err, 'bancos'));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <PanelDeslizable
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Nuevo banco"
      pie={
        <>
          <Boton variante="secundario" tamano="sm" onClick={onCerrar} disabled={guardando}>Cancelar</Boton>
          <Boton variante="primario" tamano="sm" onClick={guardar} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </Boton>
        </>
      }
    >
      <FormularioBancoCampos form={form} onChange={setForm} />
    </PanelDeslizable>
  );
}
