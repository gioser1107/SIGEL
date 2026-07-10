import type { InputHTMLAttributes } from 'react';
import './Entrada.css';

interface EntradaProps extends InputHTMLAttributes<HTMLInputElement> {
  etiqueta?: string;
  error?: string;
}

/**
 * Entrada — Componente atómico reutilizable para campos de entrada.
 * Se usa tanto en formularios públicos (InicioSesion) como en el admin.
 */
export default function Entrada({
  etiqueta,
  error,
  id,
  className = '',
  ...props
}: EntradaProps) {
  const entradaId = id || `entrada-${etiqueta?.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className={`grupo-entrada ${className}`}>
      {etiqueta && (
        <label htmlFor={entradaId} className="grupo-entrada__etiqueta">
          {etiqueta}
        </label>
      )}
      <input
        id={entradaId}
        className={`grupo-entrada__campo ${error ? 'grupo-entrada__campo--error' : ''}`}
        {...props}
      />
      {error && <span className="grupo-entrada__error">{error}</span>}
    </div>
  );
}
