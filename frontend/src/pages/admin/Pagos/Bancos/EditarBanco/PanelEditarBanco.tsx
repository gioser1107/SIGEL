import { useEffect, useState } from 'react';
import { PanelDeslizable } from '../../../../../components/admin';
import Boton from '../../../../../components/ui/Boton/Boton';
import { editarBanco } from '../../../../../services/bancos';
import type { Banco } from '../../../../../types/pagos';
import FormularioBancoCampos from '../components/FormularioBancoCampos';
import { FORM_BANCO_VACIO, bancoAFormulario, validarFormularioBanco, type FormularioBanco } from '../constants';
import { mensajeError } from '../../utils/mensajeError';

interface PanelEditarBancoProps {
  abierto: boolean;
  banco: Banco | null;
  onCerrar: () => void;
  onExito: (mensaje: string) => void;
  onError: (mensaje: string) => void;
  onRecargar: () => Promise<void>;
}

export default function PanelEditarBanco({
  abierto,
  banco,
  onCerrar,
  onExito,
  onError,
  onRecargar,
}: PanelEditarBancoProps) {
  const [form, setForm] = useState<FormularioBanco>(FORM_BANCO_VACIO);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (abierto && banco) setForm(bancoAFormulario(banco));
  }, [abierto, banco]);

  async function guardar() {
    if (!banco) return;
    const errorValidacion = validarFormularioBanco(form);
    if (errorValidacion) {
      onError(errorValidacion);
      return;
    }

    setGuardando(true);
    try {
      await editarBanco(banco.id, {
        codigo: form.codigo.trim(),
        nombre: form.nombre.trim(),
        activo: form.activo,
      });
      onExito('Banco actualizado.');
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
      titulo="Editar banco"
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
