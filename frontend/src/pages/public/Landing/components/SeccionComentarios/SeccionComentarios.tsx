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

const COMENTARIOS_FALLBACK: Comentario[] = [
  {
    id: 1,
    nombre: 'María González',
    rol: 'Viajera',
    texto: 'Viajar con ellos es realmente increíble. Destinos hermosos, servicio amable y momentos inolvidables. ¡Lo recomiendo al 100%!',
    calificacion: 5.0,
  },
  {
    id: 2,
    nombre: 'Carlos Mendoza',
    rol: 'Aventurero',
    texto: 'Itinerario muy bien planificado, guías locales expertos y atención al cliente de primera. Mi aventura no solo fue divertida, sino libre de estrés.',
    calificacion: 4.9,
  },
  {
    id: 3,
    nombre: 'Ana Rodríguez',
    rol: 'Familia',
    texto: '¡Las vacaciones perfectas en familia! El destino ideal para todos, con servicio cálido y planes flexibles. Nos hizo crear recuerdos maravillosos.',
    calificacion: 5.0,
  },
  {
    id: 4,
    nombre: 'Luis Pérez',
    rol: 'Viajero frecuente',
    texto: 'Nuestras vacaciones familiares fueron extraordinarias. Itinerario bien organizado, guías locales amigables y una experiencia inolvidable de principio a fin.',
    calificacion: 4.9,
  },
];

function resenaAComentario(resena: Resena): Comentario {
  return {
    id: resena.id,
    nombre: resena.nombre_cliente,
    rol: 'Viajero',
    texto: resena.comentario ?? 'Excelente experiencia con Travel Bqto.',
    calificacion: resena.calificacion,
  };
}

export default function SeccionComentarios() {
  const [comentarios, setComentarios] = useState<Comentario[]>(COMENTARIOS_FALLBACK);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;

    async function cargar() {
      try {
        const resenas = await obtenerResenasPublicas();
        if (!activo) return;
        if (resenas.length > 0) {
          setComentarios(resenas.map(resenaAComentario));
        }
      } catch {
        /* Mantener fallback si la API no responde */
      } finally {
        if (activo) setCargando(false);
      }
    }

    cargar();
    return () => {
      activo = false;
    };
  }, []);

  return (
    <section className="seccion-comentarios">
      <div className="seccion-comentarios__header">
        <span className="seccion-comentarios__eyebrow">Testimonios</span>
        <h2 className="seccion-comentarios__titulo">Lo que dicen nuestros viajeros</h2>
        <p className="seccion-comentarios__descripcion">
          Experiencias reales de personas que confiaron en nosotros para sus aventuras
        </p>
      </div>

      {cargando ? (
        <p className="seccion-comentarios__cargando">Cargando testimonios...</p>
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
