import type { DatosViajeNuevo, Viaje } from '../../../../../types/viaje';
import CampoGuiasViaje from '../../components/CampoGuiasViaje';
import { ESTADOS_VIAJE, ETIQUETA_ESTADO } from '../../constants';

interface PropsTabInfo {
  viaje: Viaje;
  form: DatosViajeNuevo;
  guiasOpciones: { id: number; etiqueta: string }[];
  cargandoGuias: boolean;
  onFormChange: (form: DatosViajeNuevo) => void;
}

// Pestaña Info: ficha de solo lectura y campos editables de fechas y estado
export default function TabInfoViaje({
  viaje,
  form,
  guiasOpciones,
  cargandoGuias,
  onFormChange,
}: PropsTabInfo) {
  // Actualiza un campo del formulario manteniendo el resto de valores
  const actualizarCampo = <K extends keyof DatosViajeNuevo>(
    campo: K,
    valor: DatosViajeNuevo[K],
  ) => {
    onFormChange({ ...form, [campo]: valor });
  };

  return (
    <div className="drawer-form">
      <p className="drawer-form__intro">
        Define a dónde va el viaje, qué bus asignas y cuándo sale. Es la ficha principal de la salida.
      </p>

      <div className="drawer-form__ficha">
        <div className="drawer-form__ficha-item">
          <span className="drawer-form__ficha-etiqueta">Destino</span>
          <strong>{viaje.destino_nombre ?? 'Sin destino'}</strong>
        </div>
        <div className="drawer-form__ficha-item">
          <span className="drawer-form__ficha-etiqueta">Unidad de transporte</span>
          <strong>{viaje.unidad_placa ?? 'Sin unidad'}</strong>
        </div>
      </div>

      <CampoGuiasViaje
        guiasIds={form.guias_ids ?? []}
        guiaPrincipalId={form.guia_principal_id ?? null}
        guiasOpciones={guiasOpciones}
        cargando={cargandoGuias}
        onChange={(guias_ids, guia_principal_id) =>
          onFormChange({ ...form, guias_ids, guia_principal_id })
        }
      />

      <div className="drawer-form__fila-2">
        <div className="drawer-form__campo">
          <label className="drawer-form__label">
            Fecha salida <span className="drawer-form__req">*</span>
          </label>
          <input
            className="drawer-form__input"
            type="datetime-local"
            value={form.fecha_salida ? form.fecha_salida.slice(0, 16) : ''}
            onChange={(e) => actualizarCampo('fecha_salida', e.target.value)}
          />
        </div>
        <div className="drawer-form__campo">
          <label className="drawer-form__label">Fecha regreso</label>
          <input
            className="drawer-form__input"
            type="datetime-local"
            value={form.fecha_regreso ? form.fecha_regreso.slice(0, 16) : ''}
            onChange={(e) => actualizarCampo('fecha_regreso', e.target.value || null)}
          />
        </div>
      </div>

      <div className="drawer-form__campo">
        <label className="drawer-form__label">Estado</label>
        <select
          className="drawer-form__input"
          value={form.estado}
          onChange={(e) => actualizarCampo('estado', e.target.value)}
        >
          {ESTADOS_VIAJE.map((s) => (
            <option key={s} value={s}>
              {ETIQUETA_ESTADO[s] ?? s}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
