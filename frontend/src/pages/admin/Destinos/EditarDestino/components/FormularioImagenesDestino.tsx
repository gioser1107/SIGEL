import Boton from '../../../../../components/ui/Boton/Boton';
import type { DestinoImagen } from '../../../../../types/destino';
import SelectorImagenArchivo from '../../components/SelectorImagenArchivo';

interface PropsFormularioImagenes {
  imagenes: DestinoImagen[];
  archivoNuevo: File | null;
  cargando: boolean;
  error: string | null;
  onArchivoChange: (archivo: File | null) => void;
  onSubir: () => void;
  onMarcarPortada: (imagenId: number) => void;
  onQuitar: (imagenId: number) => void;
}

export default function FormularioImagenesDestino({
  imagenes,
  archivoNuevo,
  cargando,
  error,
  onArchivoChange,
  onSubir,
  onMarcarPortada,
  onQuitar,
}: PropsFormularioImagenes) {
  return (
    <div className="dest-imagenes">
      <div className="dest-imagenes__encabezado">
        <span className="drawer-form__label">Galería de imágenes</span>
        <p className="drawer-form__ayuda">
          Sube fotos desde tu dispositivo. La primera imagen será la portada del catálogo.
        </p>
      </div>

      {error && (
        <div className="drawer-form__error" role="alert">
          {error}
        </div>
      )}

      <div className="dest-imagenes__agregar">
        <SelectorImagenArchivo
          etiqueta="Nueva imagen"
          archivo={archivoNuevo}
          cargando={cargando}
          onArchivoChange={onArchivoChange}
        />
        <Boton
          variante="secundario"
          tamano="sm"
          onClick={onSubir}
          disabled={cargando || !archivoNuevo}
        >
          {cargando ? 'Subiendo…' : 'Agregar imagen'}
        </Boton>
      </div>

      {imagenes.length === 0 ? (
        <p className="dest-imagenes__vacio">Sin imágenes. Sube una foto para mostrar portada.</p>
      ) : (
        <ul className="dest-imagenes__lista">
          {imagenes.map((img) => (
            <li key={img.id} className="dest-imagenes__item">
              <img src={img.url} alt="" className="dest-imagenes__miniatura" />
              <div className="dest-imagenes__info">
                <span className="dest-imagenes__url" title={img.url}>
                  {img.es_portada ? 'Imagen de portada' : `Imagen #${img.orden + 1}`}
                </span>
                {img.es_portada && <span className="dest-imagenes__badge">Portada</span>}
              </div>
              <div className="dest-imagenes__acciones">
                {!img.es_portada && (
                  <button
                    type="button"
                    className="dest-imagenes__btn"
                    onClick={() => onMarcarPortada(img.id)}
                    disabled={cargando}
                  >
                    Usar como portada
                  </button>
                )}
                <button
                  type="button"
                  className="dest-imagenes__btn dest-imagenes__btn--peligro"
                  onClick={() => onQuitar(img.id)}
                  disabled={cargando}
                >
                  Quitar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
