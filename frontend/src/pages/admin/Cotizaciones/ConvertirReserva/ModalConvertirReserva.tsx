import Boton from '../../../../components/ui/Boton/Boton';
import type { Cotizacion } from '../../../../types/cotizacion';
import { SIN_DATO, textoVisible } from '../../../../utils/etiquetasNegocio';

interface PropsModalConvertir {
  abierto: boolean;
  cotizacion: Cotizacion | null;
  onCerrar: () => void;
}

// Modal que redirige al módulo de Reservas para convertir una cotización aceptada
export default function ModalConvertirReserva({ abierto, cotizacion, onCerrar }: PropsModalConvertir) {
  if (!abierto || !cotizacion) return null;

  // Redirige al módulo de Reservas con el ID de la cotización en la URL
  const irAReservas = () => {
    window.location.href = `/admin/reservas?cotizacion_id=${cotizacion.id}`;
  };

  return (
    <div className="cot-convertir__overlay" onClick={onCerrar} role="presentation">
      <div
        className="cot-convertir"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Convertir en reserva"
      >
        <div className="cot-convertir__header">
          <h3>Convertir cotización en reserva</h3>
          <button className="drawer__cerrar" onClick={onCerrar} aria-label="Cerrar">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="cot-convertir__cuerpo">
          <p className="cot-convertir__info">
            <strong>{textoVisible(cotizacion.cliente_nombre, SIN_DATO.cliente)}</strong>
            {' · '}
            {cotizacion.destino_nombre}
            {cotizacion.precio_cotizado_eur !== null && ` · € ${cotizacion.precio_cotizado_eur}`}
          </p>
          <div className="cot-convertir__aviso">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p>
              Para completar la conversión debes seleccionar un viaje en el módulo de{' '}
              <strong>Reservas</strong> (módulo de María). Cuando esté listo, este botón te redirigirá
              automáticamente.
            </p>
          </div>
        </div>
        <div className="cot-convertir__acciones">
          <Boton variante="secundario" tamano="sm" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton variante="primario" tamano="sm" onClick={irAReservas}>
            Ir a Reservas →
          </Boton>
        </div>
      </div>
    </div>
  );
}
