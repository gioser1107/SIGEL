import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './HeroCarousel.css';
import TarjetaDestino from './TarjetaDestino';
import { obtenerDestinosCatalogo } from '../../../../../services/catalogo';

interface DestinoInterno {
    id: number;
    titulo: string;
    subtitulo: string;
    imagenFondo: string;
}

export default function HeroCarousel() {
    const [destinos, setDestinos] = useState<DestinoInterno[]>([]);
    const [indiceActual, setIndiceActual] = useState(0);
    const navegar = useNavigate();

    useEffect(() => {
        obtenerDestinosCatalogo()
            .then((lista) => {
                setDestinos(
                    lista.slice(0, 6).map((d) => ({
                        id: d.id,
                        titulo: d.nombre.toUpperCase(),
                        subtitulo: d.descripcion?.slice(0, 120) ?? '',
                        imagenFondo: d.imagen,
                    })),
                );
            })
            .catch(() => setDestinos([]));
    }, []);

    useEffect(() => {
        if (destinos.length === 0) return;
        const temporizador = setInterval(() => {
            setIndiceActual((prev) => (prev === destinos.length - 1 ? 0 : prev + 1));
        }, 5000);
        return () => clearInterval(temporizador);
    }, [destinos.length]);

    if (destinos.length === 0) {
        return (
            <section className="hero-carousel hero-carousel--cargando">
                <div className="hero-carousel__overlay">
                    <div className="hero-carousel__info">
                        <span className="hero-carousel__tag">Travel Bqto</span>
                        <h1 className="hero-carousel__title">Descubre Lara</h1>
                        <p className="hero-carousel__desc">
                            Explora nuestra agenda de viajes y reserva tu próxima aventura.
                        </p>
                        <div className="hero-carousel__acciones">
                            <button
                                type="button"
                                className="hero-carousel__btn"
                                onClick={() => navegar('/agenda')}
                            >
                                Ver agenda →
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    const manejarSiguiente = () => {
        setIndiceActual((prev) => (prev === destinos.length - 1 ? 0 : prev + 1));
    };

    const manejarAnterior = () => {
        setIndiceActual((prev) => (prev === 0 ? destinos.length - 1 : prev - 1));
    };

    const destinoActual = destinos[indiceActual];
    const siguienteIndice = indiceActual === destinos.length - 1 ? 0 : indiceActual + 1;
    const siguienteDestino = destinos[siguienteIndice];

    return (
        <section className="hero-carousel">
            {destinos.map((dest, index) => (
                <div
                    key={`bg-${dest.id}`}
                    className={`hero-carousel__bg ${indiceActual === index ? 'hero-carousel__bg--active' : ''}`}
                    style={{ backgroundImage: `url(${dest.imagenFondo})` }}
                />
            ))}

            <div className="hero-carousel__overlay">
                <div className="hero-carousel__info">
                    <span className="hero-carousel__tag">Descubre Lara</span>
                    <h1 className="hero-carousel__title">{destinoActual.titulo}</h1>
                    <p className="hero-carousel__desc">{destinoActual.subtitulo}</p>
                    <div className="hero-carousel__acciones">
                        <button
                            type="button"
                            className="hero-carousel__btn"
                            onClick={() => navegar(`/destino/${destinoActual.id}`)}
                        >
                            Explorar destino →
                        </button>
                        <button
                            type="button"
                            className="hero-carousel__btn hero-carousel__btn--secundario"
                            onClick={() => navegar('/agenda')}
                        >
                            Ver agenda
                        </button>
                    </div>
                </div>

                <div className="hero-carousel__cards">
                    <TarjetaDestino
                        key={siguienteDestino.id}
                        titulo={siguienteDestino.titulo}
                        imagenFondo={siguienteDestino.imagenFondo}
                        activo={true}
                        onClick={() => navegar(`/destino/${siguienteDestino.id}`)}
                    />
                </div>

                <div className="hero-carousel__controls">
                    <button type="button" onClick={manejarAnterior} className="control-btn" aria-label="Destino anterior">←</button>
                    <button type="button" onClick={manejarSiguiente} className="control-btn" aria-label="Destino siguiente">→</button>
                </div>
            </div>
        </section>
    );
}
