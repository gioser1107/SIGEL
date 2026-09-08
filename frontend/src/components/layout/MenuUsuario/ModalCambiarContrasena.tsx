import { useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import Boton from '../../ui/Boton/Boton';
import { ErrorApi } from '../../../services/api';
import { cambiarMiContrasena } from '../../../services/autenticacion';
import './ModalCambiarContrasena.css';

interface ModalCambiarContrasenaProps {
  abierto: boolean;
  onCerrar: () => void;
}

function IconoOjo({ visible }: { visible: boolean }) {
  if (visible) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function CampoContrasena({
  id,
  etiqueta,
  value,
  onChange,
  visible,
  onAlternar,
  autoComplete,
}: {
  id: string;
  etiqueta: string;
  value: string;
  onChange: (valor: string) => void;
  visible: boolean;
  onAlternar: () => void;
  autoComplete: string;
}) {
  return (
    <div className="grupo-entrada">
      <label htmlFor={id} className="grupo-entrada__etiqueta">
        {etiqueta}
      </label>
      <div className="modal-contrasena__campo-contenedor">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          className="grupo-entrada__campo modal-contrasena__campo"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          required
        />
        <button
          type="button"
          className="modal-contrasena__alternar"
          onClick={onAlternar}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          <IconoOjo visible={visible} />
        </button>
      </div>
    </div>
  );
}

function validarCambio(actual: string, nueva: string, confirmacion: string): string | null {
  if (!actual) return 'Ingresa tu contraseña actual.';
  if (!nueva) return 'Ingresa la nueva contraseña.';
  if (nueva.length < 6) return 'La nueva contraseña debe tener al menos 6 caracteres.';
  if (nueva === actual) return 'La nueva contraseña debe ser distinta a la actual.';
  if (nueva !== confirmacion) return 'Las contraseñas nuevas no coinciden.';
  return null;
}

export default function ModalCambiarContrasena({ abierto, onCerrar }: ModalCambiarContrasenaProps) {
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [verActual, setVerActual] = useState(false);
  const [verNueva, setVerNueva] = useState(false);
  const [verConfirmacion, setVerConfirmacion] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!abierto) return;

    setActual('');
    setNueva('');
    setConfirmacion('');
    setVerActual(false);
    setVerNueva(false);
    setVerConfirmacion(false);
    setError(null);
    setExito(false);
    setGuardando(false);
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return;

    function alPresionarTecla(e: KeyboardEvent) {
      if (e.key === 'Escape' && !guardando) onCerrar();
    }

    document.addEventListener('keydown', alPresionarTecla);
    return () => document.removeEventListener('keydown', alPresionarTecla);
  }, [abierto, guardando, onCerrar]);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const errorValidacion = validarCambio(actual, nueva, confirmacion);
    if (errorValidacion) {
      setError(errorValidacion);
      return;
    }

    setError(null);
    setGuardando(true);

    try {
      await cambiarMiContrasena(actual, nueva);
      setExito(true);
    } catch (err) {
      if (err instanceof ErrorApi || err instanceof Error) {
        setError(err.message);
      } else {
        setError('No se pudo actualizar la contraseña. Intenta de nuevo.');
      }
    } finally {
      setGuardando(false);
    }
  }

  if (!abierto) return null;

  return createPortal(
    <div
      className="modal-contrasena__superposicion"
      onClick={() => {
        if (!guardando) onCerrar();
      }}
      role="presentation"
    >
      <div
        className="modal-contrasena"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-contrasena-titulo"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="modal-contrasena-titulo" className="modal-contrasena__titulo">
          Cambiar contraseña
        </h3>

        {exito ? (
          <>
            <p className="modal-contrasena__exito" role="status">
              Contraseña actualizada con éxito.
            </p>
            <div className="modal-contrasena__acciones">
              <Boton variante="primario" tamano="sm" onClick={onCerrar}>
                Cerrar
              </Boton>
            </div>
          </>
        ) : (
          <form className="modal-contrasena__formulario" onSubmit={enviar}>
            <p className="modal-contrasena__ayuda">
              Ingresa tu contraseña actual y elige una nueva de al menos 6 caracteres.
            </p>

            <CampoContrasena
              id="contrasena-actual"
              etiqueta="Contraseña actual"
              value={actual}
              onChange={setActual}
              visible={verActual}
              onAlternar={() => setVerActual((v) => !v)}
              autoComplete="current-password"
            />
            <CampoContrasena
              id="contrasena-nueva"
              etiqueta="Nueva contraseña"
              value={nueva}
              onChange={setNueva}
              visible={verNueva}
              onAlternar={() => setVerNueva((v) => !v)}
              autoComplete="new-password"
            />
            <CampoContrasena
              id="contrasena-confirmacion"
              etiqueta="Confirmar nueva contraseña"
              value={confirmacion}
              onChange={setConfirmacion}
              visible={verConfirmacion}
              onAlternar={() => setVerConfirmacion((v) => !v)}
              autoComplete="new-password"
            />

            {error && (
              <p className="modal-contrasena__error" role="alert">
                {error}
              </p>
            )}

            <div className="modal-contrasena__acciones">
              <Boton variante="secundario" tamano="sm" type="button" onClick={onCerrar} disabled={guardando}>
                Cancelar
              </Boton>
              <Boton variante="primario" tamano="sm" type="submit" disabled={guardando}>
                {guardando ? 'Guardando…' : 'Actualizar'}
              </Boton>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}
