import { useRef, useState } from 'react';

const MAX_MB = 5;

interface CampoComprobanteImagenProps {
  valor: string;
  onChange: (dataUrl: string) => void;
}

export default function CampoComprobanteImagen({ valor, onChange }: CampoComprobanteImagenProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  function manejarArchivo(archivo: File | undefined) {
    if (!archivo) return;
    setError(null);

    if (!archivo.type.startsWith('image/')) {
      setError('Solo se permiten imágenes (JPG, PNG, etc.).');
      return;
    }
    if (archivo.size > MAX_MB * 1024 * 1024) {
      setError(`La imagen no puede superar ${MAX_MB} MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') onChange(reader.result);
    };
    reader.onerror = () => setError('No se pudo leer la imagen.');
    reader.readAsDataURL(archivo);
  }

  function quitar() {
    onChange('');
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="pagos-comprobante">
      <label className="pagos-formulario__label" htmlFor="pago-comprobante-file">
        Comprobante <span className="pagos-formulario__opcional">(opcional)</span>
      </label>

      <div
        className={`pagos-comprobante__zona${valor ? ' pagos-comprobante__zona--con-archivo' : ''}`}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        <input
          ref={inputRef}
          id="pago-comprobante-file"
          type="file"
          accept="image/*"
          className="pagos-comprobante__input-file"
          onChange={(e) => manejarArchivo(e.target.files?.[0])}
        />
        {valor ? (
          <div className="pagos-comprobante__preview">
            <img src={valor} alt="Vista previa del comprobante" className="pagos-comprobante__img" />
            <span className="pagos-comprobante__texto">Toca para cambiar la imagen</span>
          </div>
        ) : (
          <div className="pagos-comprobante__placeholder">
            <span className="pagos-comprobante__icono">📷</span>
            <span>Subir captura del comprobante</span>
            <small>JPG o PNG · máx. {MAX_MB} MB</small>
          </div>
        )}
      </div>

      {valor && (
        <button type="button" className="pagos-comprobante__quitar" onClick={quitar}>
          Quitar imagen
        </button>
      )}

      {error && <p className="pagos-formulario__hint pagos-formulario__hint--error">{error}</p>}
    </div>
  );
}
