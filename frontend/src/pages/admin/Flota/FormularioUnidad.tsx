import { useEffect, useState } from 'react';
import Boton from '../../../components/ui/Boton/Boton';
import { actualizarUnidad, crearUnidad } from '../../../services/unidades';
import type { DatosUnidadCrear, UnidadTransporte } from '../../../types/unidad';
import { validarUnidadForm } from './constants';

interface FormularioUnidadProps {
  abierto: boolean;
  onCerrar: () => void;
  unidad: UnidadTransporte | null;
  onGuardado: () => void;
}

export default function FormularioUnidad({ abierto, onCerrar, unidad, onGuardado }: FormularioUnidadProps) {
  const isEditar = Boolean(unidad);

  const [prevAbierto, setPrevAbierto] = useState(abierto);
  const [form, setForm] = useState<DatosUnidadCrear>({
    placa: '',
    modelo: '',
    capacidad: 40,
  });
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  // Actualizar el estado durante el renderizado (Derived State)
  if (abierto !== prevAbierto) {
    setPrevAbierto(abierto);
    if (abierto) {
      setForm({
        placa: unidad?.placa ?? '',
        modelo: unidad?.modelo ?? '',
        capacidad: unidad?.capacidad ?? 40,
      });
      setErrorForm(null);
    }
  }

  const guardar = async () => {
    const errorValidacion = validarUnidadForm(form);
    if (errorValidacion) {
      setErrorForm(errorValidacion);
      return;
    }

    setGuardando(true);
    setErrorForm(null);
    try {
      if (isEditar && unidad) {
        await actualizarUnidad(unidad.id, {
          placa: form.placa,
          modelo: form.modelo || null,
          capacidad: form.capacidad,
        });
      } else {
        await crearUnidad({
          placa: form.placa,
          modelo: form.modelo || null,
          capacidad: form.capacidad,
        });
      }
      onGuardado();
      onCerrar();
    } catch (e) {
      setErrorForm(e instanceof Error ? e.message : 'Error al guardar la unidad de transporte');
    } finally {
      setGuardando(false);
    }
  };

  useEffect(() => {
    function alPresionarTecla(e: KeyboardEvent) {
      if (e.key === 'Escape' && abierto) onCerrar();
    }
    document.addEventListener('keydown', alPresionarTecla);
    return () => document.removeEventListener('keydown', alPresionarTecla);
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  return (
    <div className="flota-modal__superposicion" onClick={onCerrar} role="presentation">
      <div
        className="flota-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flota-modal__header">
          <div>
            <h3 className="flota-modal__titulo">{isEditar ? `Editar Unidad: ${unidad?.placa}` : 'Nueva unidad de transporte'}</h3>
            <p className="flota-modal__subtitulo">Ingresa los datos del autobús.</p>
          </div>
          <button className="flota-modal__cerrar" onClick={onCerrar} aria-label="Cerrar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flota-modal__cuerpo">
          {errorForm && (
            <div className="flota-modal__error" role="alert">
              {errorForm}
            </div>
          )}

          <div className="flota-modal__campo">
            <label className="flota-modal__label">
              Placa <span className="flota-modal__req">*</span>
            </label>
            <input
              className="flota-modal__input"
              type="text"
              maxLength={16}
              placeholder="Placa del autobús"
              value={form.placa}
              onChange={(e) => setForm((f) => ({ ...f, placa: e.target.value }))}
            />
          </div>

          <div className="flota-modal__campo">
            <label className="flota-modal__label">Modelo</label>
            <input
              className="flota-modal__input"
              type="text"
              placeholder="Ej: Mercedes-Benz Sprinter"
              value={form.modelo ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, modelo: e.target.value }))}
            />
          </div>

          <div className="flota-modal__campo">
            <label className="flota-modal__label">
              Capacidad (Asientos) <span className="flota-modal__req">*</span>
            </label>
            <input
              className="flota-modal__input"
              type="number"
              min={1}
              value={form.capacidad}
              onChange={(e) => setForm((f) => ({ ...f, capacidad: parseInt(e.target.value, 10) || 1 }))}
            />
          </div>
        </div>

        <div className="flota-modal__acciones">
          <Boton variante="secundario" tamano="sm" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Boton>
          <Boton variante="primario" tamano="sm" onClick={guardar} disabled={guardando}>
            {guardando ? 'Guardando…' : isEditar ? 'Guardar cambios' : 'Crear Unidad'}
          </Boton>
        </div>
      </div>
    </div>
  );
}
