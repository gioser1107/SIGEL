import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  obtenerDestinoCatalogo,
  obtenerViajesCatalogo,
} from '../../../services/catalogo';
import type { DestinoCatalogo, ViajeCatalogo } from '../../../services/catalogo';
import { formatearEuro } from '../../../utils/formatoMoneda';
import './Detalle.css';

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
      <div className="pagina-detalle">
        <p>{error}</p>
        <Link to="/" className="pagina-detalle__volver">Volver al inicio</Link>
      </div>
    );
  }

  if (!destino) {
    return (
      <div className="pagina-detalle">
        <p>Cargando destino...</p>
      </div>
    );
  }

  const galeria = destino.imagenes && destino.imagenes.length > 0
    ? destino.imagenes
    : [{ id: 0, url: destino.imagen, orden: 0, es_portada: true }];

  return (
    <div className="pagina-detalle">
      <Link to="/" className="pagina-detalle__volver">← Volver</Link>
      <div
        className="pagina-detalle__portada"
        style={{ backgroundImage: `url(${imagenActiva || destino.imagen})` }}
      />
      {galeria.length > 1 && (
        <div className="pagina-detalle__galeria">
          {galeria.map((img) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setImagenActiva(img.url)}
              className={`pagina-detalle__miniatura${img.url === imagenActiva ? ' pagina-detalle__miniatura--activa' : ''}`}
              style={{ backgroundImage: `url(${img.url})` }}
              aria-label={`Ver imagen ${img.orden + 1}`}
            />
          ))}
        </div>
      )}
      <h1 className="pagina-detalle__titulo">{destino.nombre}</h1>
      {destino.precio_base_eur !== null && (
        <p className="pagina-detalle__precio">
          Desde {formatearEuro(destino.precio_base_eur)} / persona
        </p>
      )}
      <p className="pagina-detalle__descripcion">
        {destino.descripcion}
      </p>

      <h2 className="pagina-detalle__subtitulo">Próximas salidas</h2>
      {viajes.length === 0 ? (
        <p className="pagina-detalle__descripcion">No hay viajes programados para este destino.</p>
      ) : (
        <ul className="pagina-detalle__lista">
          {viajes.map((v) => (
            <li key={v.id}>
              {new Date(v.fecha_salida).toLocaleDateString('es-VE')} — {v.hora} — {v.cupos} cupos
            </li>
          ))}
        </ul>
      )}

      <Link to="/agenda" className="pagina-detalle__agenda">
        Ver en agenda completa →
      </Link>
    </div>
  );
}
