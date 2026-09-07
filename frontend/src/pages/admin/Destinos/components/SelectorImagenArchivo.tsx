import { useEffect, useRef, useState } from 'react';
import Boton from '../../../../components/ui/Boton/Boton';

const MAX_MB = 5;

function esImagenSubible(archivo: File): boolean {
  const tipo = archivo.type.toLowerCase();
  if (tipo.includes('heic') || tipo.includes('heif')) {
    return false;
  }
  if (tipo.startsWith('image/')) {
    return true;
  }
  if (!tipo) {
    return /\.(jpe?g|png|webp)$/i.test(archivo.name);
  }
  return false;
}

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
  const inputRef = useRef<HTMLInputElement>(null);
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  useEffect(() => {
    if (!archivo) {
      setVistaPrevia(null);
      return;
    }
    const url = URL.createObjectURL(archivo);
    setVistaPrevia(url);
    return () => URL.revokeObjectURL(url);
  }, [archivo]);

  const abrirSelector = () => {
    if (cargando) return;
    inputRef.current?.click();
  };

  const manejarSeleccion = (lista: FileList | null) => {
    const seleccionado = lista?.[0] ?? null;
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    if (!seleccionado) {
      onArchivoChange(null);
      return;
    }
    if (!esImagenSubible(seleccionado)) {
      setErrorLocal('Usa JPG, PNG o WebP. Las fotos HEIC del iPhone no se pueden subir.');
      onArchivoChange(null);
      return;
    }
    if (seleccionado.size > MAX_MB * 1024 * 1024) {
      setErrorLocal(`La imagen no puede superar ${MAX_MB} MB.`);
      onArchivoChange(null);
      return;
    }
    setErrorLocal(null);
    onArchivoChange(seleccionado);
  };

  return (
    <div className="dest-selector-imagen">
      <span className="drawer-form__label">{etiqueta}</span>
      {ayuda && <p className="drawer-form__ayuda">{ayuda}</p>}

      <div
        className={`dest-selector-imagen__zona ${archivo ? 'dest-selector-imagen__zona--con-archivo' : ''}`}
        onClick={abrirSelector}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            abrirSelector();
          }
        }}
        role="button"
        tabIndex={cargando ? -1 : 0}
        aria-label={etiqueta}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="dest-selector-imagen__input"
          disabled={cargando}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => manejarSeleccion(e.target.files)}
        />
        {vistaPrevia ? (
          <img src={vistaPrevia} alt="Vista previa" className="dest-selector-imagen__preview" />
        ) : (
          <span className="dest-selector-imagen__placeholder">
            Toca para elegir una foto de tu dispositivo
          </span>
        )}
      </div>

      {archivo && (
        <p className="dest-selector-imagen__nombre">
          {archivo.name} ({(archivo.size / 1024).toFixed(0)} KB)
        </p>
      )}

      {errorLocal && (
        <p className="drawer-form__error dest-selector-imagen__error" role="alert">
          {errorLocal}
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
