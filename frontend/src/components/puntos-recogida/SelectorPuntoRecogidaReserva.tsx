import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Boton from '../ui/Boton/Boton';
import type { PuntoRecogida } from '../../types/puntoRecogida';
import { etiquetaPunto, referenciaPunto } from './utils';
import './puntos-recogida.css';

interface SelectorPuntoRecogidaReservaProps {
  domicilios: PuntoRecogida[];
  value: number | null | undefined;
  onChange: (puntoRecogidaId: number | null) => void;
  label?: string;
  requerido?: boolean;
  cargando?: boolean;
  sinDomiciliosMensaje?: string;
  ocultarEnlacePerfil?: boolean;
}

function etiquetaDomicilio(domicilios: PuntoRecogida[], id: number | null | undefined): string | null {
  if (id == null) return null;
  const d = domicilios.find((x) => x.id === id);
  if (!d) return null;
  const ref = referenciaPunto(d);
  return ref ? `${etiquetaPunto(d)} · ${ref}` : etiquetaPunto(d);
}

export default function SelectorPuntoRecogidaReserva({
  domicilios,
  value,
  onChange,
  label = 'Domicilio de recogida',
  requerido = false,
  cargando = false,
  sinDomiciliosMensaje = 'Registra un domicilio de recogida en tu perfil antes de reservar.',
  ocultarEnlacePerfil = false,
}: SelectorPuntoRecogidaReservaProps) {
  const [modalAbierto, setModalAbierto] = useState(false);
  const etiqueta = useMemo(() => etiquetaDomicilio(domicilios, value), [domicilios, value]);

  if (cargando) {
    return (
      <div className="pr-selector-reserva">
        {label && <span className="pr-selector-reserva__label">{label}</span>}
        <p className="pr-selector-reserva__aviso">Cargando domicilios…</p>
      </div>
    );
  }

  if (domicilios.length === 0) {
    return (
      <div className="pr-selector-reserva">
        {label && (
          <span className="pr-selector-reserva__label">
            {label}
            {requerido && <span className="pr-selector-reserva__req"> *</span>}
          </span>
        )}
        <p className="pr-selector-reserva__aviso">{sinDomiciliosMensaje}</p>
        {!ocultarEnlacePerfil && (
          <Link to="/client/puntos-recogida" className="pr-aviso-admin__link" style={{ marginTop: '0.5rem', display: 'inline-block' }}>
            Ir a mis domicilios
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="pr-selector-reserva">
      {label && (
        <span className="pr-selector-reserva__label">
          {label}
          {requerido && <span className="pr-selector-reserva__req"> *</span>}
        </span>
      )}

      <div className="pr-selector-reserva__campo">
        {etiqueta ? (
          <span className="pr-selector-reserva__valor">{etiqueta}</span>
        ) : (
          <span className="pr-selector-reserva__placeholder">Sin domicilio seleccionado</span>
        )}
        <div className="pr-selector-reserva__acciones">
          <Boton type="button" variante="secundario" tamano="sm" onClick={() => setModalAbierto(true)}>
            {etiqueta ? 'Cambiar' : 'Elegir domicilio'}
          </Boton>
          {etiqueta && !requerido && (
            <button type="button" className="pr-selector-reserva__quitar" onClick={() => onChange(null)}>
              Quitar
            </button>
          )}
        </div>
      </div>

      {modalAbierto && (
        <div
          className="pr-modal-catalogo__superposicion"
          role="dialog"
          aria-modal="true"
          onClick={() => setModalAbierto(false)}
        >
          <div className="pr-modal-catalogo pr-modal-domicilio" onClick={(e) => e.stopPropagation()}>
            <div className="pr-modal-catalogo__cabecera">
              <div>
                <h3 className="pr-modal-catalogo__titulo">Mis domicilios de recogida</h3>
                <p className="pr-modal-catalogo__subtitulo">
                  Selecciona dónde debe pasar la agencia a recogerte.
                </p>
              </div>
              <button
                type="button"
                className="pr-modal-catalogo__cerrar"
                onClick={() => setModalAbierto(false)}
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
            <ul className="pr-lista pr-modal-domicilio__cuerpo pr-modal-domicilio__lista">
              {domicilios.map((d) => (
                <li key={d.id} className="pr-lista__item">
                  <button
                    type="button"
                    className="pr-modal__opcion"
                    onClick={() => {
                      onChange(d.id);
                      setModalAbierto(false);
                    }}
                  >
                    <strong>{etiquetaPunto(d)}</strong>
                    {d.direccion && <span>{d.direccion}</span>}
                    {referenciaPunto(d) && <span>Ref: {referenciaPunto(d)}</span>}
                    {d.es_predeterminado && <span className="pr-lista__badge">Predeterminado</span>}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
