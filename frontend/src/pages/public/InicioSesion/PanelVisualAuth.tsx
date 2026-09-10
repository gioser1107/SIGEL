import { useEffect, useState, type ReactNode } from 'react';
import {
  obtenerDestinosCatalogo,
  obtenerViajesCatalogo,
  type DestinoCatalogo,
  type ViajeCatalogo,
} from '../../../services/catalogo';
import { resolverUrlArchivo } from '../../../utils/resolverUrlArchivo';

const INTERVALO_MS = 5000;
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

interface SlideVisual {
  clave: string;
  titulo: string;
  descripcion: string;
  imagen: string;
}

interface PanelVisualAuthProps {
  badge: string;
  tituloFijo?: string;
  descripcionFija?: string;
  mostrarIndicadoresCarrusel?: boolean;
  children?: ReactNode;
}

function formatearFechaCorta(fecha: string): string {
  const d = new Date(`${fecha}T12:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getDate()} de ${MESES[d.getMonth()]}`;
}

function recortar(texto: string | null | undefined, max = 140): string {
  if (!texto) return '';
  const limpio = texto.trim();
  if (limpio.length <= max) return limpio;
  return `${limpio.slice(0, max).trimEnd()}…`;
}

function slidesDesdeViajes(viajes: ViajeCatalogo[]): SlideVisual[] {
  const vistos = new Set<number>();
  const slides: SlideVisual[] = [];

  for (const viaje of viajes) {
    if (vistos.has(viaje.destino_id)) continue;
    const imagen = resolverUrlArchivo(viaje.imagen);
    if (!imagen) continue;
    vistos.add(viaje.destino_id);

    const fecha = formatearFechaCorta(viaje.fecha);
    const detalle = recortar(viaje.descripcion, 110);
    slides.push({
      clave: `viaje-${viaje.id}`,
      titulo: viaje.titulo,
      descripcion: fecha
        ? `Próxima salida: ${fecha}${detalle ? `. ${detalle}` : ''}`
        : detalle,
      imagen,
    });
  }

  return slides;
}

function slidesDesdeDestinos(destinos: DestinoCatalogo[]): SlideVisual[] {
  return destinos
    .filter((destino) => Boolean(destino.imagen))
    .map((destino) => ({
      clave: `destino-${destino.id}`,
      titulo: destino.nombre,
      descripcion: recortar(destino.descripcion) || 'Viaja con Travel Bqto.',
      imagen: destino.imagen,
    }));
}

/**
 * Panel derecho de login/registro: rota las fotos de destinos y viajes del catálogo.
 */
export default function PanelVisualAuth({
  badge,
  tituloFijo,
  descripcionFija,
  mostrarIndicadoresCarrusel = false,
  children,
}: PanelVisualAuthProps) {
  const [slides, setSlides] = useState<SlideVisual[]>([]);
  const [indice, setIndice] = useState(0);

  useEffect(() => {
    let cancelado = false;

    Promise.all([
      obtenerDestinosCatalogo(),
      obtenerViajesCatalogo().catch(() => [] as ViajeCatalogo[]),
    ])
      .then(([destinos, viajes]) => {
        if (cancelado) return;
        const deViajes = slidesDesdeViajes(viajes);
        setSlides(deViajes.length > 0 ? deViajes : slidesDesdeDestinos(destinos));
      })
      .catch(() => {
        if (!cancelado) setSlides([]);
      });

    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    if (slides.length < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const temporizador = window.setInterval(() => {
      setIndice((prev) => (prev + 1) % slides.length);
    }, INTERVALO_MS);

    return () => window.clearInterval(temporizador);
  }, [slides.length]);

  const actual = slides[indice];
  const titulo = tituloFijo ?? actual?.titulo ?? 'Descubre destinos inolvidables';
  const descripcion =
    descripcionFija
    ?? actual?.descripcion
    ?? 'Viaja con total seguridad, reserva tus asientos cómodamente y explora con los mejores tours guiados.';

  return (
    <div className="inicio-sesion__bloque-visual">
      {slides.map((slide, i) => (
        <div
          key={slide.clave}
          className={`inicio-sesion__visual-fondo${i === indice ? ' inicio-sesion__visual-fondo--activo' : ''}`}
          style={{ backgroundImage: `url(${slide.imagen})` }}
          aria-hidden="true"
        />
      ))}
      <div className="inicio-sesion__visual-overlay" />
      <div className="inicio-sesion__visual-contenido">
        <div className="inicio-sesion__badge">{badge}</div>
        <h2 className="inicio-sesion__visual-titulo">{titulo}</h2>
        <p className="inicio-sesion__visual-desc">{descripcion}</p>
        {mostrarIndicadoresCarrusel && slides.length > 1 && (
          <div className="inicio-sesion__indicadores" aria-label="Destinos">
            {slides.map((slide, i) => (
              <button
                key={slide.clave}
                type="button"
                aria-label={slide.titulo}
                aria-current={i === indice ? 'true' : undefined}
                className={`inicio-sesion__indicador${i === indice ? ' activo' : ''}`}
                onClick={() => setIndice(i)}
              />
            ))}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
