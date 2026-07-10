import { useCallback, useEffect, useState } from 'react';
import Boton from '../../../components/ui/Boton/Boton';
import { crearResena, obtenerMisReservasElegibles } from '../../../services/resenas';
import type { ReservaElegibleResena } from '../../../types/resenas';
import './MisResenas.css';

function formatearFecha(fechaISO: string): string {
  const d = new Date(fechaISO);
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${d.getDate()} de ${meses[d.getMonth()]} ${d.getFullYear()}`;
}

function EstrellasLectura({ calificacion }: { calificacion: number }) {
  return (
    <div className="mis-resenas__estrellas-lectura" aria-label={`Calificación ${calificacion} de 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < calificacion ? 'mis-resenas__estrella--activa' : 'mis-resenas__estrella'}>
          ★
        </span>
      ))}
    </div>
  );
}

interface FormularioResenaProps {
  reservaId: number;
  onEnviada: (reservaId: number, resena: ReservaElegibleResena['resena']) => void;
}

function FormularioResena({ reservaId, onEnviada }: FormularioResenaProps) {
  const [calificacion, setCalificacion] = useState(5);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const manejarEnviar = async () => {
    setEnviando(true);
    setError(null);
    try {
      const respuesta = await crearResena({
        reserva_id: reservaId,
        calificacion,
        comentario: comentario.trim() || undefined,
      });
      onEnviada(reservaId, respuesta.resena);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar la reseña');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="mis-resenas__formulario">
      <p className="mis-resenas__formulario-etiqueta">Tu calificación</p>
      <div className="mis-resenas__selector-estrellas">
        {Array.from({ length: 5 }).map((_, i) => {
          const valor = i + 1;
          return (
            <button
              key={valor}
              type="button"
              className={`mis-resenas__estrella-btn ${valor <= calificacion ? 'mis-resenas__estrella-btn--activa' : ''}`}
              onClick={() => setCalificacion(valor)}
              aria-label={`${valor} estrellas`}
            >
              ★
            </button>
          );
        })}
      </div>

      <label className="mis-resenas__campo">
        <span>Comentario (opcional)</span>
        <textarea
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          rows={4}
          placeholder="Cuéntanos cómo fue tu experiencia..."
          maxLength={1000}
        />
      </label>

      {error && <p className="mis-resenas__error">{error}</p>}

      <Boton variante="primario" tamano="sm" onClick={manejarEnviar} disabled={enviando}>
        {enviando ? 'Enviando...' : 'Publicar reseña'}
      </Boton>
    </div>
  );
}

export default function MisResenas() {
  const [reservas, setReservas] = useState<ReservaElegibleResena[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const datos = await obtenerMisReservasElegibles();
      setReservas(datos);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar tus reservas');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const manejarResenaEnviada = (reservaId: number, resena: ReservaElegibleResena['resena']) => {
    setReservas((prev) =>
      prev.map((item) => (item.reserva_id === reservaId ? { ...item, resena } : item))
    );
  };

  return (
    <div className="mis-resenas">
      <div className="mis-resenas__header">
        <h1 className="mis-resenas__titulo">Mis reseñas</h1>
        <p className="mis-resenas__subtitulo">
          Comparte tu experiencia en los viajes que ya realizaste.
        </p>
      </div>

      {error && <div className="mis-resenas__alerta">{error}</div>}

      {cargando ? (
        <p className="mis-resenas__cargando">Cargando viajes...</p>
      ) : reservas.length === 0 ? (
        <div className="mis-resenas__vacio">
          <span className="mis-resenas__vacio-icono">★</span>
          <h3>Aún no tienes viajes para reseñar</h3>
          <p>Cuando completes un viaje podrás dejar tu opinión aquí.</p>
        </div>
      ) : (
        <div className="mis-resenas__lista">
          {reservas.map((item) => (
            <article key={item.reserva_id} className="mis-resenas__tarjeta">
              <div className="mis-resenas__tarjeta-header">
                <div>
                  <h3 className="mis-resenas__destino">{item.destino_titulo}</h3>
                  <p className="mis-resenas__fecha">{formatearFecha(item.fecha_viaje)}</p>
                </div>
                <span className="mis-resenas__estado">{item.estado_reserva}</span>
              </div>

              {item.resena ? (
                <div className="mis-resenas__lectura">
                  <EstrellasLectura calificacion={item.resena.calificacion} />
                  {item.resena.comentario ? (
                    <p className="mis-resenas__comentario">"{item.resena.comentario}"</p>
                  ) : (
                    <p className="mis-resenas__comentario mis-resenas__comentario--vacio">
                      Sin comentario escrito.
                    </p>
                  )}
                </div>
              ) : (
                <FormularioResena
                  reservaId={item.reserva_id}
                  onEnviada={manejarResenaEnviada}
                />
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
