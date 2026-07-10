import './TarjetaDestino.css';

interface TarjetaDestinoProps {
    titulo: string;
    imagenFondo: string;
    activo: boolean;
    onClick: () => void;
}

export default function TarjetaDestino({ titulo, imagenFondo, activo, onClick }: TarjetaDestinoProps) {
    return (
        <div
            className={`tarjeta-destino-contenedor ${activo ? 'tarjeta-destino-contenedor--activa' : ''}`}
            onClick={onClick}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick();
                }
            }}
            role="button"
            tabIndex={0}
            aria-label={`Ver destino ${titulo}`}
        >
            <div className="tarjeta-destino__contenido">
                <h3 className="tarjeta-destino__titulo">{titulo}</h3>
                <span className="tarjeta-destino__cta">Ver destino →</span>
            </div>

            <div
                className={`tarjeta-destino ${activo ? 'tarjeta-destino--activa' : ''}`}
                style={{ backgroundImage: `url(${imagenFondo})` }}
            />
        </div>
    );
}
