import { PanelDeslizable } from '../../../../components/admin';
import Boton from '../../../../components/ui/Boton/Boton';
import type { DatosDestinoNuevo, DificultadDestino } from '../../../../types/destino';
import SelectorImagenArchivo from '../components/SelectorImagenArchivo';
import { sanitizarNombrePersona } from '../../../../utils/validacionesFormulario';
import CampoMonto from '../../../../components/ui/CampoMonto/CampoMonto';
import { NIVELES_DIFICULTAD } from '../constants';

interface PropsPanelNuevo {
  abierto: boolean;
  form: DatosDestinoNuevo;
  archivoPortada: File | null;
  guardando: boolean;
  errorForm: string | null;
  onCerrar: () => void;
  onGuardar: () => void;
  onFormChange: (form: DatosDestinoNuevo) => void;
  onArchivoPortadaChange: (archivo: File | null) => void;
}

export default function PanelNuevoDestino({
  abierto,
  form,
  archivoPortada,
  guardando,
  errorForm,
  onCerrar,
  onGuardar,
  onFormChange,
  onArchivoPortadaChange,
}: PropsPanelNuevo) {
  const actualizarCampo = <K extends keyof DatosDestinoNuevo>(
    campo: K,
    valor: DatosDestinoNuevo[K],
  ) => {
    onFormChange({ ...form, [campo]: valor });
  };

  return (
    <PanelDeslizable
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Nuevo destino"
      pie={
        <>
          <Boton variante="secundario" tamano="sm" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Boton>
          <Boton variante="primario" tamano="sm" onClick={onGuardar} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Crear destino'}
          </Boton>
        </>
      }
    >
      <div className="drawer-form">
        <p className="drawer-form__intro">
          Registra un destino turístico para el catálogo y la planificación de viajes.
        </p>
        {errorForm && (
          <div className="drawer-form__error" role="alert">
            {errorForm}
          </div>
        )}

        <div className="drawer-form__campo">
          <label className="drawer-form__label" htmlFor="destino-nombre">
            Nombre <span className="drawer-form__req">*</span>
          </label>
          <input
            id="destino-nombre"
            className="drawer-form__input"
            value={form.nombre}
            onChange={(e) => actualizarCampo('nombre', sanitizarNombrePersona(e.target.value))}
          />
        </div>

        <div className="drawer-form__campo">
          <label className="drawer-form__label" htmlFor="destino-descripcion">
            Descripción
          </label>
          <textarea
            id="destino-descripcion"
            className="drawer-form__input drawer-form__textarea"
            rows={4}
            value={form.descripcion ?? ''}
            onChange={(e) => actualizarCampo('descripcion', e.target.value.slice(0, 2000))}
            maxLength={2000}
          />
        </div>

        <SelectorImagenArchivo
          etiqueta="Imagen de portada"
          ayuda="Opcional. Puedes agregar más fotos después de crear el destino."
          archivo={archivoPortada}
          cargando={guardando}
          onArchivoChange={onArchivoPortadaChange}
        />

        <div className="drawer-form__campo">
          <label className="drawer-form__label" htmlFor="destino-precio">
            Precio base (EUR) <span className="drawer-form__req">*</span>
          </label>
          <CampoMonto
            id="destino-precio"
            className="drawer-form__input"
            placeholder="Ej: 45"
            value={form.precio_base_eur}
            onValorNumerico={(n) => actualizarCampo('precio_base_eur', n)}
          />
        </div>

        <div className="drawer-form__campo">
          <label className="drawer-form__label" htmlFor="destino-dificultad">
            Dificultad
          </label>
          <select
            id="destino-dificultad"
            className="drawer-form__input"
            value={form.dificultad}
            onChange={(e) => actualizarCampo('dificultad', e.target.value as DificultadDestino)}
          >
            {NIVELES_DIFICULTAD.map((nivel) => (
              <option key={nivel} value={nivel}>
                {nivel}
              </option>
            ))}
          </select>
          <p className="drawer-form__ayuda">
            Lo elige la agencia según el destino: terreno, caminata, público o exigencia física.
            No se calcula por la duración del viaje.
          </p>
        </div>

        <div className="drawer-form__campo">
          <label className="drawer-form__check">
            <input
              type="checkbox"
              checked={form.activo ?? true}
              onChange={(e) => actualizarCampo('activo', e.target.checked)}
            />
            Destino activo en catálogo
          </label>
        </div>
      </div>
    </PanelDeslizable>
  );
}
