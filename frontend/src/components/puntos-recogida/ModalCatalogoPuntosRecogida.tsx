import { useEffect, useMemo, useRef, useState } from 'react';
import Boton from '../ui/Boton/Boton';
import { listarPuntosRecogidaCatalogo } from '../../services/puntos_recogida';
import type { PuntoRecogida } from '../../types/puntoRecogida';
import type { Parada } from '../../types/viaje';
import { etiquetaPunto } from './utils';
import './puntos-recogida.css';

interface ModalCatalogoPuntosRecogidaProps {
  abierto: boolean;
  onCerrar: () => void;
  onSeleccionar: (punto: PuntoRecogida) => void;
  excluirIds?: number[];
  onError?: (msg: string) => void;
  procesando?: boolean;
  /** Si se pasa, muestra solo las paradas del viaje en lugar del catálogo global. */
  paradas?: Parada[];
  titulo?: string;
  subtitulo?: string;
}

function paradaAPunto(p: Parada): PuntoRecogida {
  return {
    id: p.punto_recogida_id,
    nombre: p.punto_nombre ?? `Parada ${p.orden}`,
    notas_referencia: p.notas,
  };
}

export default function ModalCatalogoPuntosRecogida({
  abierto,
  onCerrar,
  onSeleccionar,
  excluirIds = [],
  onError,
  procesando = false,
  paradas,
  titulo = 'Catálogo de puntos de recogida',
  subtitulo = 'Busca y selecciona una parada oficial del catálogo.',
}: ModalCatalogoPuntosRecogidaProps) {
  const modoParadas = paradas != null;
  const [catalogo, setCatalogo] = useState<PuntoRecogida[]>([]);
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    if (!abierto) return;
    setBusqueda('');
    if (modoParadas) return;

    setCargando(true);
    listarPuntosRecogidaCatalogo()
      .then(setCatalogo)
      .catch((err) =>
        onErrorRef.current?.(err instanceof Error ? err.message : 'Error al cargar catálogo'),
      )
      .finally(() => setCargando(false));
  }, [abierto, modoParadas]);

  useEffect(() => {
    if (!abierto) return;
    document.body.style.overflow = 'hidden';
    const t = window.setTimeout(() => inputRef.current?.focus(), 120);
    return () => {
      document.body.style.overflow = '';
      window.clearTimeout(t);
    };
  }, [abierto]);

  useEffect(() => {
    function alPresionarTecla(e: KeyboardEvent) {
      if (e.key === 'Escape' && abierto && !procesando) onCerrar();
    }
    document.addEventListener('keydown', alPresionarTecla);
    return () => document.removeEventListener('keydown', alPresionarTecla);
  }, [abierto, procesando, onCerrar]);

  const filtradosCatalogo = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return catalogo
      .filter((p) => !excluirIds.includes(p.id))
      .filter((p) => {
        if (!q) return true;
        const texto = `${p.nombre} ${p.direccion ?? ''} ${p.ciudad ?? ''} ${p.estado ?? ''}`.toLowerCase();
        return texto.includes(q);
      });
  }, [catalogo, excluirIds, busqueda]);

  const filtradosParadas = useMemo(() => {
    if (!paradas) return [];
    const q = busqueda.trim().toLowerCase();
    return paradas.filter((p) => {
      if (!q) return true;
      const texto = `${p.punto_nombre ?? ''} ${p.hora_programada ?? ''} ${p.notas ?? ''}`.toLowerCase();
      return texto.includes(q);
    });
  }, [paradas, busqueda]);

  if (!abierto) return null;

  const vacio = modoParadas ? filtradosParadas.length === 0 : filtradosCatalogo.length === 0;

  return (
    <div className="pr-modal-catalogo__superposicion" onClick={procesando ? undefined : onCerrar} role="presentation">
      <div
        className="pr-modal-catalogo"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pr-modal-catalogo-titulo"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="pr-modal-catalogo__cabecera">
          <div>
            <h2 id="pr-modal-catalogo-titulo" className="pr-modal-catalogo__titulo">
              {titulo}
            </h2>
            <p className="pr-modal-catalogo__subtitulo">{subtitulo}</p>
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
        </header>

        <div className="pr-modal-catalogo__busqueda">
          <span className="pr-modal-catalogo__busqueda-icono" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </span>
          <input
            ref={inputRef}
            className="pr-modal-catalogo__input"
            type="search"
            placeholder={
              modoParadas
                ? 'Buscar por nombre, hora o notas…'
                : 'Buscar por nombre, dirección, ciudad o estado…'
            }
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            disabled={cargando || procesando}
          />
        </div>

        <div className="pr-modal-catalogo__tabla-wrap">
          {cargando && !modoParadas ? (
            <p className="pr-modal-catalogo__estado">Cargando catálogo…</p>
          ) : vacio ? (
            <p className="pr-modal-catalogo__estado">
              {busqueda.trim() ? `Sin resultados para “${busqueda.trim()}”.` : 'No hay paradas disponibles.'}
            </p>
          ) : modoParadas ? (
            <table className="pr-modal-catalogo__tabla">
              <thead>
                <tr>
                  <th>Parada</th>
                  <th>Hora</th>
                  <th>Notas</th>
                  <th aria-label="Acción" />
                </tr>
              </thead>
              <tbody>
                {filtradosParadas.map((p) => (
                  <tr key={`${p.punto_recogida_id}-${p.orden}`}>
                    <td>
                      <strong>{p.punto_nombre ?? `Parada ${p.orden}`}</strong>
                    </td>
                    <td>{p.hora_programada ?? '—'}</td>
                    <td>{p.notas ?? '—'}</td>
                    <td className="pr-modal-catalogo__celda-accion">
                      <Boton
                        type="button"
                        variante="primario"
                        tamano="sm"
                        disabled={procesando}
                        onClick={() => onSeleccionar(paradaAPunto(p))}
                      >
                        Seleccionar
                      </Boton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="pr-modal-catalogo__tabla">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Dirección</th>
                  <th>Ciudad</th>
                  <th>Estado</th>
                  <th aria-label="Acción" />
                </tr>
              </thead>
              <tbody>
                {filtradosCatalogo.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong>{etiquetaPunto(p)}</strong>
                    </td>
                    <td>{p.direccion ?? '—'}</td>
                    <td>{p.ciudad ?? '—'}</td>
                    <td>{p.estado ?? '—'}</td>
                    <td className="pr-modal-catalogo__celda-accion">
                      <Boton
                        type="button"
                        variante="primario"
                        tamano="sm"
                        disabled={procesando}
                        onClick={() => onSeleccionar(p)}
                      >
                        Seleccionar
                      </Boton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <footer className="pr-modal-catalogo__pie">
          <Boton type="button" variante="secundario" tamano="sm" onClick={onCerrar} disabled={procesando}>
            Cancelar
          </Boton>
        </footer>
      </div>
    </div>
  );
}
