import { useEffect, useState } from 'react';
import { obtenerResenasPublicas } from '../../../../../services/resenas';
import type { Resena } from '../../../../../types/resenas';
import './SeccionComentarios.css';

interface Comentario {
  id: number;
  nombre: string;
  rol: string;
  texto: string;
  calificacion: number;
}

function resenaAComentario(resena: Resena): Comentario | null {
  const texto = resena.comentario?.trim();
  if (!texto) return null;
  return {
    id: resena.id,
    nombre: resena.nombre_cliente,
    rol: resena.destino_titulo || 'Viajero',
    texto,
    calificacion: resena.calificacion,
  };
}

export default function SeccionComentarios() {
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;

    async function cargar() {
      try {
        const resenas = await obtenerResenasPublicas();
        if (!activo) return;
        setComentarios(
          resenas
            .map(resenaAComentario)
            .filter((comentario): comentario is Comentario => comentario !== null),
        );
      } catch {
        if (activo) setComentarios([]);
      } finally {
        if (activo) setCargando(false);
      }
    }

    cargar();
    return () => {
      activo = false;
    };
  }, []);

  if (!cargando && comentarios.length === 0) {
    return null;
  }

  return (
    <section className="seccion-comentarios">
      <div className="seccion-comentarios__header">
        <span className="seccion-comentarios__eyebrow">Reseñas</span>
        <h2 className="seccion-comentarios__titulo">Lo que dicen nuestros viajeros</h2>
        <p className="seccion-comentarios__descripcion">
          Comentarios de clientes que ya viajaron con Travel Bqto
        </p>
      </div>

      {cargando ? (
        <p className="seccion-comentarios__cargando">Cargando reseñas...</p>
      ) : (
        <div className="seccion-comentarios__grid">
          {comentarios.map((comentario, idx) => (
            <article
              key={comentario.id}
              className="tarjeta-comentario"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className="tarjeta-comentario__icono-comillas">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
              </div>

              <p className="tarjeta-comentario__texto">"{comentario.texto}"</p>

              <div className="tarjeta-comentario__valoracion">
                <div className="tarjeta-comentario__estrellas">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg
                      key={i}
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill={i < Math.floor(comentario.calificacion) ? 'var(--color-accent)' : '#d1d5db'}
                      stroke="none"
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  ))}
                </div>
                <span className="tarjeta-comentario__nota">{comentario.calificacion}</span>
              </div>

              <div className="tarjeta-comentario__separador" />

              <div className="tarjeta-comentario__autor">
                <div className="tarjeta-comentario__autor-inicial">
                  {comentario.nombre.charAt(0)}
                </div>
                <div className="tarjeta-comentario__autor-info">
                  <span className="tarjeta-comentario__autor-nombre">{comentario.nombre}</span>
                  <span className="tarjeta-comentario__autor-rol">{comentario.rol}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
