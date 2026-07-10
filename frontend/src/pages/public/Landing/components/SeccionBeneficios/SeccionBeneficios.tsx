import type { JSX } from 'react';
import './SeccionBeneficios.css';

// Definimos la interfaz
interface Beneficio {
    id: number;
    icono: JSX.Element;
    titulo: string;
    descripcion: string;
}

// Datos separados de la vista
const DATOS_BENEFICIOS: Beneficio[] = [
    {
        id: 1,
        icono: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>,
        titulo: 'Traslado garantizado',
        descripcion: 'Ofrecemos acompañamiento seguro hasta tu lugar de hospedaje.'
    },
    {
        id: 2,
        icono: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M16 12h.01" /></svg>,
        titulo: 'Reserva fácil',
        descripcion: 'Proceso rápido y sencillo para asegurar tus próximas fechas.'
    },
    {
        id: 3,
        icono: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
        titulo: 'Los mejores guías',
        descripcion: 'Personal capacitado listo para guiarte en cada aventura.'
    },
    {
        id: 4,
        icono: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M15 9l-6 6" /><circle cx="9" cy="9" r="1" /><circle cx="15" cy="15" r="1" /></svg>,
        titulo: 'Múltiples promociones',
        descripcion: 'Disfruta de descuentos especiales y sorteos exclusivos.'
    }
];

export default function SeccionBeneficios() {
    return (
        <section className="seccion-beneficios">
            <div className="seccion-beneficios__encabezado">
                <h2 className="seccion-beneficios__titulo">Nuestros beneficios</h2>
                <p className="seccion-beneficios__subtitulo">Disfruta de una experiencia completa al viajar con nosotros</p>
            </div>

            <div className="seccion-beneficios__cuadricula">
                {DATOS_BENEFICIOS.map((item) => (
                    <article key={item.id} className="tarjeta-beneficio">
                        <div className="tarjeta-beneficio__contenedor-icono">
                            {item.icono}
                        </div>
                        <h3 className="tarjeta-beneficio__titulo">{item.titulo}</h3>
                        <p className="tarjeta-beneficio__descripcion">{item.descripcion}</p>
                    </article>
                ))}
            </div>
        </section>
    );
}