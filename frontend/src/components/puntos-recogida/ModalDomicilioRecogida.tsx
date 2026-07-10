import { useEffect } from 'react';
import Boton from '../ui/Boton/Boton';
import FormularioPuntoRecogidaCampos, {
  type ValoresFormularioPuntoRecogida,
} from './FormularioPuntoRecogidaCampos';
import type { CiudadUbicacion, EstadoUbicacion } from '../../types/cliente';
import './puntos-recogida.css';

interface ModalDomicilioRecogidaProps {
  abierto: boolean;
  titulo: string;
  subtitulo?: string;
  procesando?: boolean;
  idPrefix?: string;
  valores: ValoresFormularioPuntoRecogida;
  estadoId: string;
  ciudadId: string;
  estados: EstadoUbicacion[];
  ciudades: CiudadUbicacion[];
  cargandoCiudades: boolean;
  error?: string | null;
  onChange: (campo: keyof ValoresFormularioPuntoRecogida, valor: string) => void;
  onEstadoChange: (id: string) => void;
  onCiudadChange: (id: string) => void;
  onCerrar: () => void;
  onGuardar: () => void;
  etiquetaGuardar?: string;
}

export default function ModalDomicilioRecogida({
  abierto,
  titulo,
  subtitulo = 'Indica la dirección exacta y referencias para que la agencia te encuentre.',
  procesando = false,
  idPrefix = 'pr-modal',
  valores,
  estadoId,
  ciudadId,
  estados,
  ciudades,
  cargandoCiudades,
  error,
  onChange,
  onEstadoChange,
  onCiudadChange,
  onCerrar,
  onGuardar,
  etiquetaGuardar = 'Guardar',
}: ModalDomicilioRecogidaProps) {
  useEffect(() => {
    if (!abierto) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !procesando) onCerrar();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [abierto, procesando, onCerrar]);

  if (!abierto) return null;

  return (
    <div
      className="pr-modal-catalogo__superposicion"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${idPrefix}-titulo`}
      onClick={() => {
        if (!procesando) onCerrar();
      }}
    >
      <div
        className="pr-modal-catalogo pr-modal-domicilio"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pr-modal-catalogo__cabecera">
          <div>
            <h2 id={`${idPrefix}-titulo`} className="pr-modal-catalogo__titulo">
              {titulo}
            </h2>
            {subtitulo && <p className="pr-modal-catalogo__subtitulo">{subtitulo}</p>}
          </div>
          <button
            type="button"
            className="pr-modal-catalogo__cerrar"
            onClick={onCerrar}
            disabled={procesando}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="pr-modal-domicilio__cuerpo">
          <FormularioPuntoRecogidaCampos
            idPrefix={idPrefix}
            valores={valores}
            estadoId={estadoId}
            ciudadId={ciudadId}
            estados={estados}
            ciudades={ciudades}
            cargandoCiudades={cargandoCiudades}
            error={error}
            onChange={onChange}
            onEstadoChange={onEstadoChange}
            onCiudadChange={onCiudadChange}
          />
        </div>

        <div className="pr-modal-catalogo__pie">
          <Boton type="button" variante="secundario" tamano="sm" onClick={onCerrar} disabled={procesando}>
            Cancelar
          </Boton>
          <Boton type="button" variante="primario" tamano="sm" onClick={onGuardar} disabled={procesando}>
            {procesando ? 'Guardando…' : etiquetaGuardar}
          </Boton>
        </div>
      </div>
    </div>
  );
}
