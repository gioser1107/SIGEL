import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FormularioPago from '../../../components/client/FormularioPago/FormularioPago';
import MapaAsientos from '../../../components/client/MapaAsientos/MapaAsientos';
import Boton from '../../../components/ui/Boton/Boton';
import { formatearEuro } from '../../../utils/formatoMoneda';
import './Dashboard.css';

interface InformacionPago {
  metodo: string;
  banco: string;
  referencia: string;
  monto: string;
  fecha: string;
  cantidadPuestos: number;
  comprobanteArchivo: File | null;
}

export default function Dashboard() {
  const [paso, setPaso] = useState(1);
  const [datosPago, setDatosPago] = useState<InformacionPago | null>(null);
  const [asientos, setAsientos] = useState<number[]>([]);
  const navegar = useNavigate();

  // Simulación de los datos del viaje del cliente
  const detallesViaje = {
    destino: 'Parque Nacional Morrocoy (Chichiriviche)',
    fecha: '15 de Junio de 2026',
    hora: '06:00 AM',
    salida: 'Terminal Privado TravelBqto, Este de Barquisimeto',
    vehiculo: 'Unidad de Transporte VIP #08 (Busscar double-decker)',
    precioPorAsiento: 25,
  };

  const manejarEnvioPago = (datos: InformacionPago) => {
    setDatosPago(datos);
    setPaso(2);
  };

  const manejarConfirmacionAsientos = (asientosSeleccionados: number[]) => {
    setAsientos(asientosSeleccionados);
    setPaso(3);
  };

  const manejarRegresoPago = () => {
    setPaso(1);
  };

  const manejarReiniciar = () => {
    setPaso(1);
    setDatosPago(null);
    setAsientos([]);
  };

  return (
    <div className="client-dashboard">

      {/* ═══ BOARDING PASS — Ticket del Viaje ═══ */}
      <div className="ticket">
        {/* Cabecera del ticket */}
        <div className="ticket__header">
          <span className="ticket__tag">✈ Viaje Próximo</span>
          <div className={`ticket__badge ${paso === 3 ? 'ticket__badge--confirmed' : 'ticket__badge--pending'}`}>
            {paso === 3 ? 'Confirmado' : 'Pago Pendiente'}
          </div>
        </div>

        {/* Ruta: Origen → Destino */}
        <div className="ticket__route">
          <div className="ticket__point">
            <span className="ticket__point-code">BQT</span>
            <span className="ticket__point-name">Barquisimeto</span>
          </div>
          <div className="ticket__route-line">
            <span className="ticket__route-dot"></span>
            <span className="ticket__route-dash"></span>
            <span className="ticket__route-icon">🚍</span>
            <span className="ticket__route-dash"></span>
            <span className="ticket__route-dot"></span>
          </div>
          <div className="ticket__point">
            <span className="ticket__point-code">MCY</span>
            <span className="ticket__point-name">Morrocoy</span>
          </div>
        </div>

        {/* Línea de corte con muescas */}
        <div className="ticket__tear">
          <span className="ticket__notch ticket__notch--left"></span>
          <span className="ticket__tear-line"></span>
          <span className="ticket__notch ticket__notch--right"></span>
        </div>

        {/* Detalles del boarding pass en grid */}
        <div className="ticket__details">
          <div className="ticket__detail">
            <span className="ticket__detail-label">Fecha</span>
            <span className="ticket__detail-value">{detallesViaje.fecha}</span>
          </div>
          <div className="ticket__detail">
            <span className="ticket__detail-label">Hora</span>
            <span className="ticket__detail-value">{detallesViaje.hora}</span>
          </div>
          <div className="ticket__detail">
            <span className="ticket__detail-label">Vehículo</span>
            <span className="ticket__detail-value">VIP #08</span>
          </div>
        </div>
      </div>

      {/* ═══ STEPPER — Indicador de Pasos ═══ */}
      <div className="client-dashboard__stepper">
        <div className={`client-dashboard__step ${paso >= 1 ? 'client-dashboard__step--active' : ''} ${paso > 1 ? 'client-dashboard__step--completed' : ''}`}>
          <div className="client-dashboard__step-number">1</div>
          <div className="client-dashboard__step-label">Registrar Pago</div>
        </div>
        <div className="client-dashboard__step-connector" />
        <div className={`client-dashboard__step ${paso >= 2 ? 'client-dashboard__step--active' : ''} ${paso > 2 ? 'client-dashboard__step--completed' : ''}`}>
          <div className="client-dashboard__step-number">2</div>
          <div className="client-dashboard__step-label">Elegir Asiento</div>
        </div>
        <div className="client-dashboard__step-connector" />
        <div className={`client-dashboard__step ${paso >= 3 ? 'client-dashboard__step--active' : ''}`}>
          <div className="client-dashboard__step-number">3</div>
          <div className="client-dashboard__step-label">Confirmación</div>
        </div>
      </div>

      {/* ═══ CONTENIDO DE CADA PASO ═══ */}
      <div className="client-dashboard__content-area">
        {paso === 1 && (
          <FormularioPago onSubmit={manejarEnvioPago} />
        )}

        {paso === 2 && datosPago && (
          <MapaAsientos
            cantidadPuestos={datosPago.cantidadPuestos}
            alConfirmar={manejarConfirmacionAsientos}
            alRegresar={manejarRegresoPago}
          />
        )}

        {paso === 3 && datosPago && (
          <div className="receipt-ticket">
            {/* Celebración animada */}
            <div className="receipt-ticket__celebration">
              <span className="receipt-ticket__emoji">🎉</span>
              <h2 className="receipt-ticket__title">¡Registro Completado!</h2>
              <p className="receipt-ticket__subtitle">
                Tu boleto ha sido emitido exitosamente
              </p>
            </div>

            {/* Línea de corte superior con muescas */}
            <div className="receipt-ticket__tear">
              <span className="receipt-ticket__notch receipt-ticket__notch--left"></span>
              <span className="receipt-ticket__tear-line"></span>
              <span className="receipt-ticket__notch receipt-ticket__notch--right"></span>
            </div>

            {/* Itinerario del viaje estilo timeline */}
            <div className="receipt-ticket__itinerary">
              <h3 className="receipt-ticket__section-title">Itinerario del Viaje</h3>
              <div className="receipt-ticket__timeline">
                <div className="receipt-ticket__timeline-item">
                  <span className="receipt-ticket__timeline-time">{detallesViaje.hora}</span>
                  <div className="receipt-ticket__timeline-marker">
                    <span className="receipt-ticket__timeline-dot"></span>
                    <span className="receipt-ticket__timeline-line"></span>
                  </div>
                  <div className="receipt-ticket__timeline-info">
                    <span className="receipt-ticket__timeline-place">Barquisimeto</span>
                    <span className="receipt-ticket__timeline-detail">{detallesViaje.salida}</span>
                  </div>
                </div>
                <div className="receipt-ticket__timeline-item">
                  <span className="receipt-ticket__timeline-time">—</span>
                  <div className="receipt-ticket__timeline-marker">
                    <span className="receipt-ticket__timeline-dot receipt-ticket__timeline-dot--end"></span>
                  </div>
                  <div className="receipt-ticket__timeline-info">
                    <span className="receipt-ticket__timeline-place">Morrocoy</span>
                    <span className="receipt-ticket__timeline-detail">{detallesViaje.destino}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Detalles de la reserva (como factura) */}
            <div className="receipt-ticket__invoice">
              <div className="receipt-ticket__invoice-row">
                <span className="receipt-ticket__invoice-label">Asientos</span>
                <span className="receipt-ticket__invoice-value receipt-ticket__invoice-value--highlight">
                  {asientos.sort((a, b) => a - b).join(', ')}
                </span>
              </div>
              <div className="receipt-ticket__invoice-row">
                <span className="receipt-ticket__invoice-label">Vehículo</span>
                <span className="receipt-ticket__invoice-value">{detallesViaje.vehiculo}</span>
              </div>
              <div className="receipt-ticket__invoice-row">
                <span className="receipt-ticket__invoice-label">Método de Pago</span>
                <span className="receipt-ticket__invoice-value">
                  {datosPago.metodo === 'pago_movil' ? 'Pago Móvil' : 'Transferencia'} ({datosPago.banco})
                </span>
              </div>
              <div className="receipt-ticket__invoice-row">
                <span className="receipt-ticket__invoice-label">Referencia</span>
                <span className="receipt-ticket__invoice-value">{datosPago.referencia}</span>
              </div>
              <div className="receipt-ticket__invoice-divider"></div>
              <div className="receipt-ticket__invoice-row receipt-ticket__invoice-row--total">
                <span className="receipt-ticket__invoice-label">Total Pagado</span>
                <span className="receipt-ticket__invoice-value receipt-ticket__invoice-value--total">
                  {formatearEuro(parseFloat(datosPago.monto))}
                </span>
              </div>
            </div>

            {/* Estado */}
            <div className="receipt-ticket__status-bar">
              <span className="receipt-ticket__status-dot"></span>
              <span className="receipt-ticket__status-text">Pendiente de Aprobación</span>
            </div>

            {/* Línea de corte inferior con muescas */}
            <div className="receipt-ticket__tear">
              <span className="receipt-ticket__notch receipt-ticket__notch--left"></span>
              <span className="receipt-ticket__tear-line"></span>
              <span className="receipt-ticket__notch receipt-ticket__notch--right"></span>
            </div>

            {/* Barcode decorativo */}
            <div className="receipt-ticket__barcode">
              <div className="receipt-ticket__barcode-bars">
                {Array.from({ length: 40 }).map((_, i) => (
                  <span
                    key={i}
                    className="receipt-ticket__bar"
                    style={{ width: i % 3 === 0 ? '3px' : i % 2 === 0 ? '2px' : '1px' }}
                  ></span>
                ))}
              </div>
              <span className="receipt-ticket__barcode-number">TBQ-2026-{datosPago.referencia}</span>
            </div>

            {/* Acciones */}
            <div className="receipt-ticket__actions">
              <Boton type="button" variante="secundario" onClick={manejarReiniciar}>
                Modificar Registro
              </Boton>
              <Boton type="button" variante="primario" onClick={() => navegar('/')}>
                Volver al Inicio
              </Boton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
