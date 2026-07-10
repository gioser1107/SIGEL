import type { CiudadUbicacion, EstadoUbicacion } from '../../types/cliente';
import '../../pages/admin/Clientes/Clientes.css';

export interface ValoresFormularioPuntoRecogida {
  nombre: string;
  direccion: string;
  notas: string;
}

interface FormularioPuntoRecogidaCamposProps {
  idPrefix?: string;
  valores: ValoresFormularioPuntoRecogida;
  estadoId: string;
  ciudadId: string;
  estados: EstadoUbicacion[];
  ciudades: CiudadUbicacion[];
  cargandoEstados?: boolean;
  cargandoCiudades: boolean;
  referenciaOpcional?: boolean;
  compacto?: boolean;
  error?: string | null;
  onChange: (campo: keyof ValoresFormularioPuntoRecogida, valor: string) => void;
  onEstadoChange: (id: string) => void;
  onCiudadChange: (id: string) => void;
}

export default function FormularioPuntoRecogidaCampos({
  idPrefix = 'pr',
  valores,
  estadoId,
  ciudadId,
  estados,
  ciudades,
  cargandoEstados = false,
  cargandoCiudades,
  referenciaOpcional = false,
  compacto = false,
  error,
  onChange,
  onEstadoChange,
  onCiudadChange,
}: FormularioPuntoRecogidaCamposProps) {
  return (
    <div className={`drawer-form${compacto ? ' drawer-form--compacto' : ''}`}>
      {error && (
        <div className="drawer-form__error" role="alert">
          {error}
        </div>
      )}

      <div className="drawer-form__campo">
        <label className="drawer-form__label" htmlFor={`${idPrefix}-nombre`}>
          Etiqueta <span className="drawer-form__req">*</span>
        </label>
        <input
          id={`${idPrefix}-nombre`}
          className="drawer-form__input"
          value={valores.nombre}
          onChange={(e) => onChange('nombre', e.target.value)}
          placeholder='Ej: Mi casa, Casa de mamá'
        />
      </div>

      <div className="drawer-form__campo">
        <label className="drawer-form__label" htmlFor={`${idPrefix}-dir`}>
          Dirección <span className="drawer-form__req">*</span>
        </label>
        <input
          id={`${idPrefix}-dir`}
          className="drawer-form__input"
          value={valores.direccion}
          onChange={(e) => onChange('direccion', e.target.value)}
          placeholder="Calle, número, urbanización, edificio, piso, apto."
        />
      </div>

      <div className="drawer-form__ubicacion">
        <p className="drawer-form__ubicacion-hint">
          Primero elige el estado; después selecciona la ciudad.
        </p>
        <div className="drawer-form__fila-2">
          <div className="drawer-form__campo">
            <label className="drawer-form__label" htmlFor={`${idPrefix}-estado`}>
              1. Estado <span className="drawer-form__req">*</span>
            </label>
            <select
              id={`${idPrefix}-estado`}
              className="drawer-form__input"
              value={estadoId}
              disabled={cargandoEstados}
              onChange={(e) => onEstadoChange(e.target.value)}
            >
              <option value="">
                {cargandoEstados ? 'Cargando estados…' : 'Seleccionar estado…'}
              </option>
              {estados.map((e) => (
                <option key={e.id} value={String(e.id)}>{e.nombre}</option>
              ))}
            </select>
          </div>
          <div className="drawer-form__campo">
            <label className="drawer-form__label" htmlFor={`${idPrefix}-ciudad`}>
              2. Ciudad <span className="drawer-form__req">*</span>
            </label>
            <select
              id={`${idPrefix}-ciudad`}
              className="drawer-form__input"
              value={ciudadId}
              disabled={!estadoId || cargandoCiudades || cargandoEstados}
              onChange={(e) => onCiudadChange(e.target.value)}
            >
              <option value="">
                {!estadoId
                  ? 'Primero selecciona el estado'
                  : cargandoCiudades
                    ? 'Cargando ciudades…'
                    : 'Seleccionar ciudad…'}
              </option>
              {ciudades.map((c) => (
                <option key={c.id} value={String(c.id)}>{c.nombre}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="drawer-form__campo">
        <label className="drawer-form__label" htmlFor={`${idPrefix}-notas`}>
          Referencia{referenciaOpcional ? ' (opcional)' : ''}
          {!referenciaOpcional && <span className="drawer-form__req"> *</span>}
        </label>
        <input
          id={`${idPrefix}-notas`}
          className="drawer-form__input"
          value={valores.notas}
          onChange={(e) => onChange('notas', e.target.value)}
          placeholder="Portón azul, casa esquinera, frente al kiosco…"
        />
      </div>
    </div>
  );
}
