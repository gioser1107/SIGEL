import { useState, useMemo, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import ModalDetalleViaje from '../../../components/ui/ModalDetalleViaje/ModalDetalleViaje';
import type { ViajeAgenda } from '../../../types/viaje';
import { agruparViajesPorFecha, obtenerViajesCatalogo } from '../../../services/catalogo';
import type { ViajeCatalogo } from '../../../services/catalogo';
import { formatearEuro } from '../../../utils/formatoMoneda';
import './Agenda.css';

interface EventosPorDia {
    [fecha: string]: ViajeAgenda[];
}

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function formatFecha(year: number, month: number, day: number): string {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const DIFICULTAD_COLOR: Record<string, string> = {
    'Fácil': '#10b981',
    'Moderado': '#f59e0b',
    'Difícil': '#ef4444',
};

/* ─────────────────────────────────────────
   COMPONENTE
───────────────────────────────────────── */
export default function Agenda() {
    const enPortal = useLocation().pathname.startsWith('/client');
    const hoy = new Date();
    const [mesActual, setMesActual] = useState(hoy.getMonth());
    const [anioActual, setAnioActual] = useState(hoy.getFullYear());
    const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null);
    const [viajeParaModal, setViajeParaModal] = useState<ViajeAgenda | null>(null);
    const [agendaDatos, setAgendaDatos] = useState<EventosPorDia>({});
    const [cargandoAgenda, setCargandoAgenda] = useState(true);
    const [errorAgenda, setErrorAgenda] = useState<string | null>(null);

    useEffect(() => {
        const mesParam = `${anioActual}-${String(mesActual + 1).padStart(2, '0')}`;
        setCargandoAgenda(true);
        setErrorAgenda(null);
        obtenerViajesCatalogo({ mes: mesParam })
            .then((viajes: ViajeCatalogo[]) => {
                const agrupados = agruparViajesPorFecha(viajes);
                setAgendaDatos(agrupados);

                const hoyClave = formatFecha(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
                if (
                    mesActual === hoy.getMonth() &&
                    anioActual === hoy.getFullYear() &&
                    agrupados[hoyClave]?.length
                ) {
                    setDiaSeleccionado(hoyClave);
                }
            })
            .catch((err: unknown) => {
                setAgendaDatos({});
                const msg = err instanceof Error ? err.message : 'No se pudieron cargar los viajes.';
                setErrorAgenda(msg);
            })
            .finally(() => setCargandoAgenda(false));
    }, [mesActual, anioActual]);

    const esHoy = (dia: number) => {
        return (
            dia === hoy.getDate() &&
            mesActual === hoy.getMonth() &&
            anioActual === hoy.getFullYear()
        );
    };

    const esMesPasado = (mes: number, anio: number) => {
        return anio < hoy.getFullYear() || (anio === hoy.getFullYear() && mes < hoy.getMonth());
    };

    const irMesAnterior = () => {
        if (esMesPasado(mesActual - 1, anioActual)) return;
        if (mesActual === 0) {
            setMesActual(11);
            setAnioActual(a => a - 1);
        } else {
            setMesActual(m => m - 1);
        }
        setDiaSeleccionado(null);
    };

    const irMesSiguiente = () => {
        if (mesActual === 11) {
            setMesActual(0);
            setAnioActual(a => a + 1);
        } else {
            setMesActual(m => m + 1);
        }
        setDiaSeleccionado(null);
    };

    // Generar grilla del mes
    const diasGrilla = useMemo(() => {
        const primerDia = new Date(anioActual, mesActual, 1).getDay();
        const diasEnMes = new Date(anioActual, mesActual + 1, 0).getDate();
        const celdas: Array<{ dia: number | null; fecha: string | null }> = [];

        // Celdas vacías al inicio
        for (let i = 0; i < primerDia; i++) {
            celdas.push({ dia: null, fecha: null });
        }
        // Días del mes
        for (let d = 1; d <= diasEnMes; d++) {
            celdas.push({ dia: d, fecha: formatFecha(anioActual, mesActual, d) });
        }
        // Relleno al final para completar la última fila
        while (celdas.length % 7 !== 0) {
            celdas.push({ dia: null, fecha: null });
        }
        return celdas;
    }, [mesActual, anioActual]);

    const viajesDelDia: ViajeAgenda[] = diaSeleccionado ? (agendaDatos[diaSeleccionado] ?? []) : [];

    const puedoRetroceder = !esMesPasado(mesActual - 1 < 0 ? 11 : mesActual - 1, mesActual - 1 < 0 ? anioActual - 1 : anioActual);

    return (
        <div className={enPortal ? 'agenda agenda--portal' : 'agenda'}>
            {enPortal ? (
                <header className="agenda__cabecera-portal">
                    <h1 className="agenda__cabecera-portal-titulo">Agenda</h1>
                    <p className="agenda__cabecera-portal-desc">
                        Selecciona un día para ver los planes disponibles. Los días marcados tienen experiencias esperándote.
                    </p>
                </header>
            ) : (
                <header className="agenda__hero">
                    <div className="agenda__hero-inner">
                        <Link to="/" className="agenda__back-link">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M19 12H5M12 5l-7 7 7 7" />
                            </svg>
                            Inicio
                        </Link>
                        <div className="agenda__hero-titulo">
                            <span className="agenda__hero-eyebrow">Agenda de Experiencias</span>
                            <h1 className="agenda__hero-h1">Calendario de Viajes</h1>
                            <p className="agenda__hero-desc">
                                Selecciona un día para ver los planes disponibles. Los días marcados tienen experiencias esperándote.
                            </p>
                        </div>
                    </div>
                </header>
            )}

            <div className="agenda__main">
                {errorAgenda && (
                    <p className="agenda__error" role="alert">
                        {errorAgenda}
                    </p>
                )}
                {cargandoAgenda && (
                    <p className="agenda__cargando">Cargando viajes del mes...</p>
                )}
                {/* Navegación de mes */}
                <div className="agenda__mes-nav">
                    <button
                        className="agenda__mes-btn"
                        onClick={irMesAnterior}
                        disabled={!puedoRetroceder}
                        aria-label="Mes anterior"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M15 18l-6-6 6-6" />
                        </svg>
                    </button>

                    <div className="agenda__mes-label">
                        <span className="agenda__mes-nombre">{MESES[mesActual]}</span>
                        <span className="agenda__mes-anio">{anioActual}</span>
                    </div>

                    <button
                        className="agenda__mes-btn"
                        onClick={irMesSiguiente}
                        aria-label="Mes siguiente"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M9 18l6-6-6-6" />
                        </svg>
                    </button>
                </div>

                {/* Encabezados de días de la semana */}
                <div className="agenda__semana-header">
                    {DIAS_SEMANA.map(dia => (
                        <div key={dia} className="agenda__semana-dia">{dia}</div>
                    ))}
                </div>

                {/* Grilla de días */}
                <div className="agenda__grilla">
                    {diasGrilla.map((celda, idx) => {
                        if (!celda.dia || !celda.fecha) {
                            return <div key={`vacia-${idx}`} className="agenda__celda agenda__celda--vacia" />;
                        }
                        const tieneEvento = !!agendaDatos[celda.fecha];
                        const numEventos = agendaDatos[celda.fecha]?.length ?? 0;
                        const seleccionado = diaSeleccionado === celda.fecha;
                        const esDiaHoy = esHoy(celda.dia);

                        return (
                            <button
                                key={celda.fecha}
                                className={[
                                    'agenda__celda',
                                    tieneEvento ? 'agenda__celda--con-evento' : '',
                                    seleccionado ? 'agenda__celda--seleccionada' : '',
                                    esDiaHoy ? 'agenda__celda--hoy' : '',
                                ].join(' ')}
                                onClick={() => {
                                    if (!tieneEvento) return;
                                    setDiaSeleccionado(seleccionado ? null : celda.fecha);
                                }}
                                aria-label={`${celda.dia} de ${MESES[mesActual]}${tieneEvento ? `, ${numEventos} experiencia${numEventos > 1 ? 's' : ''}` : ''}`}
                                disabled={!tieneEvento}
                            >
                                <span className="agenda__celda-numero">{celda.dia}</span>
                                {tieneEvento && (
                                    <div className="agenda__celda-indicadores">
                                        {Array.from({ length: Math.min(numEventos, 3) }).map((_, i) => (
                                            <span key={i} className="agenda__celda-punto" />
                                        ))}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* ── PANEL DE VIAJES ── */}
                {diaSeleccionado && viajesDelDia.length > 0 && (
                    <section className="agenda__panel" aria-live="polite">
                        <div className="agenda__panel-header">
                            <div className="agenda__panel-fecha-badge">
                                <span className="agenda__panel-dia-num">
                                    {new Date(diaSeleccionado + 'T12:00:00').getDate()}
                                </span>
                                <span className="agenda__panel-mes-txt">
                                    {MESES[new Date(diaSeleccionado + 'T12:00:00').getMonth()]}
                                </span>
                            </div>
                            <div>
                                <h2 className="agenda__panel-titulo">Experiencias del día</h2>
                                <p className="agenda__panel-subtitulo">
                                    {viajesDelDia.length} plan{viajesDelDia.length > 1 ? 'es' : ''} disponible{viajesDelDia.length > 1 ? 's' : ''}
                                </p>
                            </div>
                            <button
                                className="agenda__panel-cerrar"
                                onClick={() => setDiaSeleccionado(null)}
                                aria-label="Cerrar panel"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="agenda__tarjetas">
                            {viajesDelDia.map((viaje, idx) => (
                                <article
                                    key={viaje.id}
                                    className="agenda__tarjeta"
                                    style={{ animationDelay: `${idx * 80}ms` }}
                                >
                                    {/* Imagen de fondo */}
                                    <div
                                        className="agenda__tarjeta-imagen"
                                        style={{ backgroundImage: `url(${viaje.imagen})` }}
                                    >
                                        <div className="agenda__tarjeta-overlay" />
                                        <span
                                            className="agenda__tarjeta-dificultad"
                                            style={{ background: DIFICULTAD_COLOR[viaje.dificultad] }}
                                        >
                                            {viaje.dificultad}
                                        </span>
                                    </div>

                                    {/* Info */}
                                    <div className="agenda__tarjeta-info">
                                        <h3 className="agenda__tarjeta-titulo">{viaje.titulo}</h3>
                                        <p className="agenda__tarjeta-ubicacion">
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                                <circle cx="12" cy="10" r="3" />
                                            </svg>
                                            {viaje.ubicacion}
                                        </p>

                                        <div className="agenda__tarjeta-meta">
                                            <span className="agenda__tarjeta-meta-item">
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                                                </svg>
                                                {viaje.hora}
                                            </span>
                                            <span className="agenda__tarjeta-meta-item">
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                                </svg>
                                                {viaje.cupos} cupos
                                            </span>
                                            <span className="agenda__tarjeta-meta-item">
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M3 12h18M3 6h18M3 18h18" />
                                                </svg>
                                                {viaje.duracion}
                                            </span>
                                        </div>

                                        <div className="agenda__tarjeta-footer">
                                            <div className="agenda__tarjeta-precio">
                                                <span className="agenda__tarjeta-precio-monto">{formatearEuro(viaje.precio)}</span>
                                                <span className="agenda__tarjeta-precio-sufijo">/persona</span>
                                            </div>
                                            <button className="agenda__tarjeta-btn" onClick={() => setViajeParaModal(viaje)}>
                                                Detalles
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                    <path d="M5 12h14M12 5l7 7-7 7" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>
                )}

                {/* Leyenda */}
                <div className="agenda__leyenda">
                    <span className="agenda__leyenda-item">
                        <span className="agenda__leyenda-punto agenda__leyenda-punto--evento" />
                        Días con experiencias
                    </span>
                    <span className="agenda__leyenda-item">
                        <span className="agenda__leyenda-punto agenda__leyenda-punto--hoy" />
                        Hoy
                    </span>
                </div>
            </div>
            {/* ── MODAL DE DETALLE ── */}
            {viajeParaModal && diaSeleccionado && (
                <ModalDetalleViaje
                    viaje={viajeParaModal}
                    fecha={diaSeleccionado}
                    fechaFormateada={`${new Date(diaSeleccionado + 'T12:00:00').getDate()} de ${MESES[new Date(diaSeleccionado + 'T12:00:00').getMonth()]} de ${new Date(diaSeleccionado + 'T12:00:00').getFullYear()}`}
                    onCerrar={() => setViajeParaModal(null)}
                />
            )}
        </div>
    );
}
