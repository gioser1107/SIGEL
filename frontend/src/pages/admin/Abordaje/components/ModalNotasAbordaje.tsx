import { useEffect, useState } from 'react';
import Boton from '../../../../components/ui/Boton/Boton';
import './ModalNotasAbordaje.css';

interface PropsModalNotasAbordaje {
  abierto: boolean;
  titulo: string;
  mensaje: string;
  notasIniciales?: string;
  cargando?: boolean;
  onConfirmar: (notas: string) => void;
  onCerrar: () => void;
}

export default function ModalNotasAbordaje({
  abierto,
  titulo,
  mensaje,
  notasIniciales = '',
  cargando = false,
  onConfirmar,
  onCerrar,
}: PropsModalNotasAbordaje) {
  const [notas, setNotas] = useState(notasIniciales);

  useEffect(() => {
    if (abierto) setNotas(notasIniciales);
  }, [abierto, notasIniciales]);

  useEffect(() => {
    function alPresionarTecla(e: KeyboardEvent) {
      if (e.key === 'Escape' && abierto) onCerrar();
    }
    document.addEventListener('keydown', alPresionarTecla);
    return () => document.removeEventListener('keydown', alPresionarTecla);
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  return (
    <div className="modal-notas-abordaje__superposicion" onClick={onCerrar} role="presentation">
      <div
        className="modal-notas-abordaje"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-notas-abordaje-titulo"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="modal-notas-abordaje-titulo" className="modal-notas-abordaje__titulo">
          {titulo}
        </h2>
        <p className="modal-notas-abordaje__mensaje">{mensaje}</p>
        <label className="modal-notas-abordaje__label" htmlFor="notas-abordaje">
          Notas (opcional)
        </label>
        <textarea
          id="notas-abordaje"
          className="modal-notas-abordaje__textarea drawer-form__input"
          rows={3}
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Ej.: No respondió llamada"
        />
        <div className="modal-notas-abordaje__acciones">
          <Boton variante="secundario" tamano="sm" onClick={onCerrar} disabled={cargando}>
            Cancelar
          </Boton>
          <Boton
            variante="primario"
            tamano="sm"
            onClick={() => onConfirmar(notas.trim())}
            disabled={cargando}
          >
            Confirmar
          </Boton>
        </div>
      </div>
    </div>
  );
}
