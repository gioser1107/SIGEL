import { useEffect, useState, type JSX } from 'react';
import { Link } from 'react-router-dom';
import { obtenerDestinosCatalogo, obtenerEstadisticasCatalogo } from '../../../../../services/catalogo';
import './SeccionNosotros.css';

interface Estadistica {
    id: string;
    icono: JSX.Element;
    numero: string;
    etiqueta: string;
    dinamico?: boolean;
}

const ESTADISTICAS_BASE: Estadistica[] = [
    {
        id: 'viajes',
        icono: (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
            </svg>
        ),
        numero: '—',
        etiqueta: 'Viajes próximos',
        dinamico: true,
    },
    {
        id: 'origen',
        icono: (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
        ),
        numero: 'Bqto',
        etiqueta: 'Salidas desde Lara',
    },
    {
        id: 'destinos',
        icono: (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
        ),
        numero: '—',
        etiqueta: 'Destinos activos',
        dinamico: true,
    },
    {
        id: 'experiencia',
        icono: (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
        ),
        numero: '5',
        etiqueta: 'Años de experiencia',
    },
];

export default function SeccionNosotros() {
    const [estadisticas, setEstadisticas] = useState(ESTADISTICAS_BASE);
    const [imagenAgencia, setImagenAgencia] = useState('');

    useEffect(() => {
        obtenerEstadisticasCatalogo()
            .then((stats) => {
                setEstadisticas((prev) =>
                    prev.map((stat) => {
                        if (stat.id === 'destinos') {
                            return { ...stat, numero: String(stats.destinos_activos) };
                        }
                        if (stat.id === 'viajes') {
                            return { ...stat, numero: String(stats.viajes_proximos) };
                        }
                        return stat;
                    }),
                );
            })
            .catch(() => {});
        obtenerDestinosCatalogo()
            .then((lista) => {
                const conFoto = lista.find((d) => d.imagen);
                if (conFoto?.imagen) setImagenAgencia(conFoto.imagen);
            })
            .catch(() => {});
    }, []);

    return (
        <section className="seccion-nosotros" id="nosotros">
            <div className="seccion-nosotros__contenido">
                <div className="seccion-nosotros__izquierda">
                    <span className="seccion-nosotros__eyebrow">Sobre nosotros</span>
                    <h2 className="seccion-nosotros__titulo">
                        Agencia de viajes en Barquisimeto
                    </h2>
                    <p className="seccion-nosotros__descripcion">
                        En Travel Bqto organizamos salidas en autobús a destinos
                        de Venezuela: reserva de asiento, traslado y guía de la
                        agencia. Trabajamos con fechas publicadas, cupos reales
                        y el mismo trato de siempre, de Barquisimeto para el país.
                    </p>

                    <div className="seccion-nosotros__estadisticas">
                        {estadisticas.map((stat) => (
                            <div key={stat.id} className="stat-card">
                                <div className="stat-card__icono">
                                    {stat.icono}
                                </div>
                                <span className="stat-card__numero">{stat.numero}</span>
                                <span className="stat-card__etiqueta">{stat.etiqueta}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="seccion-nosotros__derecha">
                    <div className="seccion-nosotros__imagen-wrapper">
                        {imagenAgencia ? (
                            <img
                                src={imagenAgencia}
                                alt="Destino de Travel Bqto"
                                className="seccion-nosotros__imagen"
                            />
                        ) : (
                            <div className="seccion-nosotros__imagen seccion-nosotros__imagen--vacia" aria-hidden="true" />
                        )}
                        <Link to="/agenda" className="seccion-nosotros__badge">
                            <span className="seccion-nosotros__badge-text">
                                Ver<br />agenda
                            </span>
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
