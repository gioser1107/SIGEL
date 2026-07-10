import { useEffect, useId, useState } from 'react';
import Boton from '../../../../components/ui/Boton/Boton';
// Boton se usa condicionalmente cuando mostrarBotonSubir=true

const TIPOS_ACEPTADOS = 'image/jpeg,image/png,image/webp';
const MAX_MB = 5;

interface PropsSelectorImagen {
  etiqueta?: string;
  ayuda?: string;
  archivo: File | null;
  cargando?: boolean;
  onArchivoChange: (archivo: File | null) => void;
  onSubir?: () => void;
  textoBotonSubir?: string;
  mostrarBotonSubir?: boolean;
}

export default function SelectorImagenArchivo({
  etiqueta = 'Imagen',
  ayuda = `JPG, PNG o WebP. Máximo ${MAX_MB} MB.`,
  archivo,
  cargando = false,
  onArchivoChange,
  onSubir,
  textoBotonSubir = 'Subir imagen',
  mostrarBotonSubir = false,
}: PropsSelectorImagen) {
  const inputId = useId();
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null);

  useEffect(() => {
    if (!archivo) {
      setVistaPrevia(null);
      return;
    }
    const url = URL.createObjectURL(archivo);
    setVistaPrevia(url);
    return () => URL.revokeObjectURL(url);
  }, [archivo]);

  const manejarSeleccion = (lista: FileList | null) => {
    const seleccionado = lista?.[0] ?? null;
    if (!seleccionado) {
      onArchivoChange(null);
      return;
    }
    if (seleccionado.size > MAX_MB * 1024 * 1024) {
      alert(`La imagen no puede superar ${MAX_MB} MB.`);
      return;
    }
    onArchivoChange(seleccionado);
  };

  return (
    <div className="dest-selector-imagen">
      <label className="drawer-form__label" htmlFor={inputId}>
        {etiqueta}
      </label>
      {ayuda && <p className="drawer-form__ayuda">{ayuda}</p>}

      <div
        className={`dest-selector-imagen__zona ${archivo ? 'dest-selector-imagen__zona--con-archivo' : ''}`}
      >
        <input
          id={inputId}
          type="file"
          accept={TIPOS_ACEPTADOS}
          className="dest-selector-imagen__input"
          disabled={cargando}
          onChange={(e) => manejarSeleccion(e.target.files)}
        />
        <label htmlFor={inputId} className="dest-selector-imagen__etiqueta-zona">
          {vistaPrevia ? (
            <img src={vistaPrevia} alt="Vista previa" className="dest-selector-imagen__preview" />
          ) : (
            <span className="dest-selector-imagen__placeholder">
              Toca para elegir una foto de tu dispositivo
            </span>
          )}
        </label>
      </div>

      {archivo && (
        <p className="dest-selector-imagen__nombre">
          {archivo.name} ({(archivo.size / 1024).toFixed(0)} KB)
        </p>
      )}

      {mostrarBotonSubir && onSubir && (
        <Boton
          variante="secundario"
          tamano="sm"
          onClick={onSubir}
          disabled={cargando || !archivo}
        >
          {cargando ? 'Subiendo…' : textoBotonSubir}
        </Boton>
      )}
    </div>
  );
}
