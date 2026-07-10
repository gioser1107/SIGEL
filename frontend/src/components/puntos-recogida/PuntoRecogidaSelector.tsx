import { useEffect, useMemo, useRef, useState } from 'react';
import { listarPuntosRecogidaCatalogo } from '../../services/puntos_recogida';
import type { PuntoRecogida } from '../../types/puntoRecogida';
import { etiquetaPunto } from './utils';
import './puntos-recogida.css';

interface PuntoRecogidaSelectorProps {
  excluirIds?: number[];
  onSeleccionar: (punto: PuntoRecogida) => void;
  onError?: (msg: string) => void;
}

export default function PuntoRecogidaSelector({
  excluirIds = [],
  onSeleccionar,
  onError,
}: PuntoRecogidaSelectorProps) {
  const [catalogo, setCatalogo] = useState<PuntoRecogida[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    setCargando(true);
    listarPuntosRecogidaCatalogo()
      .then(setCatalogo)
      .catch((err) =>
        onErrorRef.current?.(err instanceof Error ? err.message : 'Error al cargar catálogo'),
      )
      .finally(() => setCargando(false));
  }, []);

  const opciones = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return catalogo
      .filter((p) => !excluirIds.includes(p.id))
      .filter((p) => {
        if (!q) return true;
        const texto = `${p.nombre} ${p.direccion ?? ''} ${p.ciudad ?? ''} ${p.estado ?? ''}`.toLowerCase();
        return texto.includes(q);
      });
  }, [catalogo, excluirIds, busqueda]);

  return (
    <div className="pr-selector">
      <input
        className="pr-selector__busqueda"
        type="search"
        placeholder="Buscar en el catálogo…"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />
      {cargando ? (
        <p className="pr-selector__hint">Cargando catálogo…</p>
      ) : opciones.length === 0 ? (
        <p className="pr-selector__hint">No hay puntos que coincidan.</p>
      ) : (
        <ul className="pr-selector__lista">
          {opciones.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="pr-selector__opcion"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSeleccionar(p);
                }}
              >
                <strong>{etiquetaPunto(p)}</strong>
                {p.direccion && <span>{p.direccion}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
