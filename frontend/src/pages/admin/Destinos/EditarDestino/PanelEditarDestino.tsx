import { PanelDeslizable } from '../../../../components/admin';
import Boton from '../../../../components/ui/Boton/Boton';
import type { DatosDestinoNuevo, Destino, DestinoImagen } from '../../../../types/destino';
import { formatPrecio } from '../utils/formatearDestino';
import FormularioImagenesDestino from './components/FormularioImagenesDestino';
import { sanitizarNombrePersona } from '../../../../utils/validacionesFormulario';

interface PropsPanelEditar {
  abierto: boolean;
  destino: Destino | null;
  form: DatosDestinoNuevo;
  guardando: boolean;
  errorForm: string | null;
  imagenes: DestinoImagen[];
  archivoNuevo: File | null;
  cargandoImagenes: boolean;
  errorImagenes: string | null;
  onCerrar: () => void;
  onGuardar: () => void;
  onFormChange: (form: DatosDestinoNuevo) => void;
  onArchivoNuevoChange: (archivo: File | null) => void;
  onSubirImagen: () => void;
  onMarcarPortada: (imagenId: number) => void;
  onQuitarImagen: (imagenId: number) => void;
}

export default function PanelEditarDestino({
  abierto,
  destino,
  form,
  guardando,
  errorForm,
  imagenes,
  archivoNuevo,
  cargandoImagenes,
  errorImagenes,
  onCerrar,
  onGuardar,
  onFormChange,
  onArchivoNuevoChange,
  onSubirImagen,
  onMarcarPortada,
  onQuitarImagen,
}: PropsPanelEditar) {
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
      titulo="Editar destino"
      subtitulo={destino ? destino.nombre : ''}
      pie={
        <>
          <Boton variante="secundario" tamano="sm" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Boton>
          <Boton variante="primario" tamano="sm" onClick={onGuardar} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </Boton>
        </>
      }
    >
      <div className="drawer-form">
        {errorForm && (
          <div className="drawer-form__error" role="alert">
            {errorForm}
          </div>
        )}

        <FormularioImagenesDestino
          imagenes={imagenes}
          archivoNuevo={archivoNuevo}
          cargando={cargandoImagenes}
          error={errorImagenes}
          onArchivoChange={onArchivoNuevoChange}
          onSubir={onSubirImagen}
          onMarcarPortada={onMarcarPortada}
          onQuitar={onQuitarImagen}
        />

        <div className="drawer-form__campo">
          <label className="drawer-form__label" htmlFor="destino-editar-nombre">
            Nombre <span className="drawer-form__req">*</span>
          </label>
          <input
            id="destino-editar-nombre"
            className="drawer-form__input"
            value={form.nombre}
            onChange={(e) => actualizarCampo('nombre', sanitizarNombrePersona(e.target.value))}
          />
        </div>

        <div className="drawer-form__campo">
          <label className="drawer-form__label" htmlFor="destino-editar-descripcion">
            Descripción
          </label>
          <textarea
            id="destino-editar-descripcion"
            className="drawer-form__input drawer-form__textarea"
            rows={4}
            value={form.descripcion ?? ''}
            onChange={(e) => actualizarCampo('descripcion', e.target.value)}
          />
        </div>

        <div className="drawer-form__campo">
          <label className="drawer-form__label" htmlFor="destino-editar-precio">
            Precio base (EUR) <span className="drawer-form__req">*</span>
          </label>
          <input
            id="destino-editar-precio"
            className="drawer-form__input"
            type="number"
            min="0"
            step="0.01"
            value={form.precio_base_eur}
            onChange={(e) => actualizarCampo('precio_base_eur', Number(e.target.value))}
          />
          {destino && (
            <p className="drawer-form__ayuda">Actual: {formatPrecio(destino.precio_base_eur)}</p>
          )}
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
