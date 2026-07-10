import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  obtenerDestinoCatalogo,
  obtenerViajesCatalogo,
} from '../../../services/catalogo';
import type { DestinoCatalogo, ViajeCatalogo } from '../../../services/catalogo';
import { formatearEuro } from '../../../utils/formatoMoneda';

export default function Detalle() {
  const { id } = useParams<{ id: string }>();
  const [destino, setDestino] = useState<DestinoCatalogo | null>(null);
  const [viajes, setViajes] = useState<ViajeCatalogo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [imagenActiva, setImagenActiva] = useState<string>('');

  useEffect(() => {
    if (!id) return;
    const destinoId = Number(id);
    if (Number.isNaN(destinoId)) {
      setError('Destino no válido');
      return;
    }

    Promise.all([
      obtenerDestinoCatalogo(destinoId),
      obtenerViajesCatalogo({ destino_id: destinoId }),
    ])
      .then(([dest, listaViajes]) => {
        setDestino(dest);
        setImagenActiva(dest.imagen);
        setViajes(listaViajes);
      })
      .catch(() => setError('No se pudo cargar el destino'));
  }, [id]);

  if (error) {
    return (
      <div style={{ padding: 'var(--spacing-4xl) var(--spacing-2xl)', paddingTop: 'calc(var(--navbar-height) + var(--spacing-3xl))' }}>
        <p>{error}</p>
        <Link to="/">Volver al inicio</Link>
      </div>
    );
  }

  if (!destino) {
    return (
      <div style={{ padding: 'var(--spacing-4xl) var(--spacing-2xl)', paddingTop: 'calc(var(--navbar-height) + var(--spacing-3xl))' }}>
        <p>Cargando destino...</p>
      </div>
    );
  }

  const galeria = destino.imagenes && destino.imagenes.length > 0
    ? destino.imagenes
    : [{ id: 0, url: destino.imagen, orden: 0, es_portada: true }];

  return (
    <div style={{ padding: 'var(--spacing-4xl) var(--spacing-2xl)', paddingTop: 'calc(var(--navbar-height) + var(--spacing-3xl))' }}>
      <Link to="/">← Volver</Link>
      <div
        style={{
          marginTop: 'var(--spacing-xl)',
          borderRadius: '16px',
          height: '280px',
          backgroundImage: `url(${imagenActiva || destino.imagen})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      {galeria.length > 1 && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
          {galeria.map((img) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setImagenActiva(img.url)}
              style={{
                width: 72,
                height: 52,
                borderRadius: 8,
                border: img.url === imagenActiva ? '2px solid var(--color-primary)' : '2px solid transparent',
                padding: 0,
                overflow: 'hidden',
                cursor: 'pointer',
                background: `url(${img.url}) center/cover no-repeat`,
              }}
              aria-label={`Ver imagen ${img.orden + 1}`}
            />
          ))}
        </div>
      )}
      <h1 style={{ marginTop: 'var(--spacing-xl)' }}>{destino.nombre}</h1>
      {destino.precio_base_eur !== null && (
        <p style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
          Desde {formatearEuro(destino.precio_base_eur)} / persona
        </p>
      )}
      <p style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--spacing-md)', whiteSpace: 'pre-wrap' }}>
        {destino.descripcion}
      </p>

      <h2 style={{ marginTop: 'var(--spacing-2xl)' }}>Próximas salidas</h2>
      {viajes.length === 0 ? (
        <p style={{ color: 'var(--color-text-secondary)' }}>No hay viajes programados para este destino.</p>
      ) : (
        <ul style={{ marginTop: 'var(--spacing-md)', paddingLeft: '1.25rem' }}>
          {viajes.map((v) => (
            <li key={v.id} style={{ marginBottom: 'var(--spacing-sm)' }}>
              {new Date(v.fecha_salida).toLocaleDateString('es-VE')} — {v.hora} — {v.cupos} cupos
            </li>
          ))}
        </ul>
      )}

      <Link
        to="/agenda"
        style={{ display: 'inline-block', marginTop: 'var(--spacing-xl)', color: 'var(--color-primary)' }}
      >
        Ver en agenda completa →
      </Link>
    </div>
  );
}
