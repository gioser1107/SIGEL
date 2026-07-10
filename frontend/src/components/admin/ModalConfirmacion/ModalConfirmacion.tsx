import { useEffect } from 'react';
import Boton from '../../ui/Boton/Boton';
import './ModalConfirmacion.css';

interface ModalConfirmacionProps {
  abierto: boolean;
  titulo: string;
  mensaje: string;
  error?: string | null;
  textoConfirmar?: string;
  textoCancelar?: string;
  variante?: 'peligro' | 'primario';
  cargando?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}

export default function ModalConfirmacion({
  abierto,
  titulo,
  mensaje,
  error,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  variante = 'peligro',
  cargando = false,
  onConfirmar,
  onCancelar,
}: ModalConfirmacionProps) {
  useEffect(() => {
    function alPresionarTecla(e: KeyboardEvent) {
      if (e.key === 'Escape' && abierto) onCancelar();
    }
    document.addEventListener('keydown', alPresionarTecla);
    return () => document.removeEventListener('keydown', alPresionarTecla);
  }, [abierto, onCancelar]);

  if (!abierto) return null;

  return (
    <div className="modal-confirmacion__superposicion" onClick={onCancelar} role="presentation">
      <div
        className="modal-confirmacion"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="modal-confirmacion-titulo"
        aria-describedby="modal-confirmacion-mensaje"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`modal-confirmacion__icono modal-confirmacion__icono--${variante}`} aria-hidden="true">
          {variante === 'peligro' ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          )}
        </div>

        <div className="modal-confirmacion__cuerpo">
          <h3 id="modal-confirmacion-titulo" className="modal-confirmacion__titulo">{titulo}</h3>
          <p id="modal-confirmacion-mensaje" className="modal-confirmacion__mensaje">{mensaje}</p>
          {error && (
            <p className="modal-confirmacion__error" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="modal-confirmacion__acciones">
          <Boton variante="secundario" tamano="sm" onClick={onCancelar} disabled={cargando}>
            {textoCancelar}
          </Boton>
          <Boton variante={variante} tamano="sm" onClick={onConfirmar} disabled={cargando}>
            {cargando ? 'Procesando…' : textoConfirmar}
          </Boton>
        </div>
      </div>
    </div>
  );
}
