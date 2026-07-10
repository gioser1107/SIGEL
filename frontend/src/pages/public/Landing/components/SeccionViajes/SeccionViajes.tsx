import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { obtenerDestinosCatalogo } from '../../../../../services/catalogo';
import type { DestinoCatalogo } from '../../../../../services/catalogo';
import './SeccionViajes.css';

export default function SeccionViajes() {
    const [destinos, setDestinos] = useState<DestinoCatalogo[]>([]);

    useEffect(() => {
        obtenerDestinosCatalogo()
            .then((lista) => setDestinos(lista.slice(0, 4)))
            .catch(() => setDestinos([]));
    }, []);

    return (
        <section className="seccion-viajes" id="destinos">
            <h2 className="seccion-viajes__titulo">Los favoritos del momento</h2>

            <div className="seccion-viajes__cuadricula">
                {destinos.map((destino) => (
                    <article key={destino.id} className="tarjeta-viaje">
                        <Link to={`/destino/${destino.id}`} className="tarjeta-viaje__enlace">
                            <div className="tarjeta-viaje__contenedor-imagen">
                                <img src={destino.imagen} alt={destino.nombre} className="tarjeta-viaje__imagen" />
                                <div className="tarjeta-viaje__calificacion">
                                    {destino.precio_base_eur ? `€${destino.precio_base_eur}` : '—'}
                                </div>
                            </div>

                            <div className="tarjeta-viaje__contenido">
                                <span className="tarjeta-viaje__titulo-link">
                                    <h3 className="tarjeta-viaje__titulo">{destino.nombre}</h3>
                                    <svg className="tarjeta-viaje__titulo-icono" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M5 12h14M12 5l7 7-7 7" />
                                    </svg>
                                </span>
                            </div>
                        </Link>
                    </article>
                ))}
            </div>

            {destinos.length > 0 && (
                <div className="seccion-viajes__pie">
                    <Link to="/agenda" className="seccion-viajes__btn-agenda">
                        Ver todos los viajes
                    </Link>
                </div>
            )}
        </section>
    );
}
