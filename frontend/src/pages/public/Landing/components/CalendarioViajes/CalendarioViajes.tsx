import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ModalDetalleViaje from '../../../../../components/ui/ModalDetalleViaje/ModalDetalleViaje';
import { obtenerViajesCatalogo } from '../../../../../services/catalogo';
import type { ViajeCatalogo } from '../../../../../services/catalogo';
import { formatearEuro } from '../../../../../utils/formatoMoneda';
import './CalendarioViajes.css';

const MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function formatearFechaViaje(fecha: string): string {
    const d = new Date(`${fecha}T12:00:00`);
    return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

export default function CalendarioViajes() {
    const carruselRef = useRef<HTMLDivElement>(null);
    const [viajes, setViajes] = useState<ViajeCatalogo[]>([]);
    const [cargando, setCargando] = useState(true);
    const [viajeModal, setViajeModal] = useState<ViajeCatalogo | null>(null);

    useEffect(() => {
        obtenerViajesCatalogo()
            .then((lista) => setViajes(lista.slice(0, 8)))
            .catch(() => setViajes([]))
            .finally(() => setCargando(false));
    }, []);

    const scrollIzquierda = () => {
        if (carruselRef.current) {
            carruselRef.current.scrollBy({ left: -424, behavior: 'smooth' });
        }
    };

    const scrollDerecha = () => {
        if (carruselRef.current) {
            carruselRef.current.scrollBy({ left: 424, behavior: 'smooth' });
        }
    };

    const primerViaje = viajes[0];
    const fechaInsignia = primerViaje
        ? new Date(primerViaje.fecha_salida)
        : new Date();

    return (
        <section className="calendario-viajes">

            <header className="calendario-viajes__encabezado">
                <div className="calendario-viajes__fecha-insignia">
                    <span className="insignia-dia">{fechaInsignia.getDate()}</span>
                    <span className="insignia-mes">
                        {fechaInsignia.toLocaleDateString('es-VE', { month: 'long' })}
                    </span>
                </div>

                <div className="calendario-viajes__textos">
                    <span className="calendario-viajes__subtitulo">Próximos viajes</span>
                    <h2 className="calendario-viajes__titulo">Viajes disponibles</h2>
                </div>

                <div className="calendario-viajes__acciones">
                    <div className="calendario-viajes__controles">
                        <button onClick={scrollIzquierda} className="control-btn" aria-label="Anterior">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
                        </button>
                        <button onClick={scrollDerecha} className="control-btn" aria-label="Siguiente">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
                        </button>
                    </div>
                </div>
            </header>

            <div className="calendario-viajes__carrusel" ref={carruselRef}>
                {cargando && <p className="calendario-viajes__cargando">Cargando viajes...</p>}
                {!cargando && viajes.length === 0 && (
                    <p className="calendario-viajes__cargando">No hay viajes programados por ahora.</p>
                )}
                {viajes.map((viaje) => (
                    <article
                        key={viaje.id}
                        className="tarjeta-cartelera"
                        style={{ backgroundImage: `url(${viaje.imagen})` }}
                        onClick={() => setViajeModal(viaje)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setViajeModal(viaje);
                            }
                        }}
                        role="button"
                        tabIndex={0}
                        aria-label={`Ver detalle de ${viaje.titulo}`}
                    >
                        <div className="tarjeta-cartelera__info-glass">
                            <div className="info-glass__detalles">
                                <h3 className="info-glass__titulo">{viaje.titulo}</h3>
                                <p className="info-glass__ubicacion">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                                    {viaje.ubicacion}
                                </p>
                            </div>

                            <div className="info-glass__precio-caja">
                                <span className="precio-monto">{formatearEuro(viaje.precio)}</span>
                                <span className="precio-sufijo">/Persona</span>
                            </div>
                        </div>
                    </article>
                ))}
            </div>

            <div className="calendario-viajes__pie">
                <Link to="/agenda" className="btn-agenda-completa-centrado">
                    Ver agenda completa
                </Link>
            </div>

            {viajeModal && (
                <ModalDetalleViaje
                    viaje={viajeModal}
                    fecha={viajeModal.fecha}
                    fechaFormateada={formatearFechaViaje(viajeModal.fecha)}
                    onCerrar={() => setViajeModal(null)}
                />
            )}

        </section>
    );
}
