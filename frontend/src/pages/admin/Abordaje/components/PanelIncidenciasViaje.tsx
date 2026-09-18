import { useState } from 'react';
import Boton from '../../../../components/ui/Boton/Boton';
import { anularIncidenciaViaje, crearIncidenciaViaje } from '../../../../services/viajes';
import type { IncidenciaViaje } from '../../../../types/abordaje';

const TIPOS = [
  { id: 'retraso', etiqueta: 'Retraso' },
  { id: 'eventualidad', etiqueta: 'Eventualidad' },
  { id: 'incidencia', etiqueta: 'Incidencia' },
] as const;

interface Props {
  viajeId: number;
  incidencias: IncidenciaViaje[];
  puedeRegistrar: boolean;
  onCambio: () => Promise<void> | void;
}

export default function PanelIncidenciasViaje({
  viajeId,
  incidencias,
  puedeRegistrar,
  onCambio,
}: Props) {
  const [tipo, setTipo] = useState<string>('retraso');
  const [descripcion, setDescripcion] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    setGuardando(true);
    setError(null);
    try {
      await crearIncidenciaViaje(viajeId, { tipo, descripcion });
      setDescripcion('');
      await onCambio();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar la incidencia.');
    } finally {
      setGuardando(false);
    }
  }

  async function anular(id: number) {
    setGuardando(true);
    setError(null);
    try {
      await anularIncidenciaViaje(viajeId, id);
      await onCambio();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo anular la incidencia.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="abordaje-incidencias">
      <h3 className="abordaje-incidencias__titulo">Retrasos e incidencias</h3>
      {error && (
        <p className="cotizaciones__error" role="alert">
          {error}
        </p>
      )}
      {incidencias.length === 0 ? (
        <p className="abordaje-incidencias__vacio">Sin incidencias registradas en este viaje.</p>
      ) : (
        <ul className="abordaje-incidencias__lista">
          {incidencias.map((item) => (
            <li key={item.id} className="abordaje-incidencias__item">
              <div>
                <strong>{TIPOS.find((t) => t.id === item.tipo)?.etiqueta ?? item.tipo}</strong>
                <span>
                  {item.ocurrio_en
                    ? new Date(item.ocurrio_en).toLocaleString('es-VE')
                    : ''}
                  {item.registrado_por_nombre ? ` · ${item.registrado_por_nombre}` : ''}
                </span>
                <p>{item.descripcion}</p>
              </div>
              {puedeRegistrar && (
                <Boton
                  variante="secundario"
                  tamano="sm"
                  disabled={guardando}
                  onClick={() => void anular(item.id)}
                >
                  Anular
                </Boton>
              )}
            </li>
          ))}
        </ul>
      )}
      {puedeRegistrar && (
        <form
          className="abordaje-incidencias__form"
          onSubmit={(e) => {
            e.preventDefault();
            void guardar();
          }}
        >
          <select
            className="drawer-form__input"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
          >
            {TIPOS.map((opcion) => (
              <option key={opcion.id} value={opcion.id}>
                {opcion.etiqueta}
              </option>
            ))}
          </select>
          <textarea
            className="drawer-form__input drawer-form__textarea"
            rows={2}
            maxLength={2000}
            placeholder="Describe el retraso, la eventualidad o la incidencia…"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            required
          />
          <Boton type="submit" variante="primario" tamano="sm" disabled={guardando || descripcion.trim().length < 5}>
            Registrar
          </Boton>
        </form>
      )}
    </section>
  );
}
