import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReservas } from '../../../context/Reservas';
import FormularioPago from '../../../components/client/FormularioPago/FormularioPago';
import FormularioPasajeros, {
  type EstadoFormularioPasajeros,
} from '../../../components/client/FormularioPasajeros/FormularioPasajeros';
import MapaAsientos from '../../../components/client/MapaAsientos/MapaAsientos';
import Boton from '../../../components/ui/Boton/Boton';
import { formatearBs, formatearEuro } from '../../../utils/formatoMoneda';
import {
  construirReportePagoPortal,
  montoBsSaldoPendiente,
  montoBsSugerido,
  montoBsTotalReserva,
} from '../../../services/pagosPortal';
import { crearReservaCliente, asignarAsientosReservaPortal } from '../../../services/reservas';
import { obtenerAsientosDisponiblesPortal } from '../../../services/viajes';
import type { AsientoViaje } from '../../../types/viaje';
import { ErrorApi } from '../../../services/api';
import { obtenerUsuarioSesion } from '../../../services/autenticacion';
import { usePagoPortal } from '../../../hooks/usePagoPortal';
import { ETIQUETA_ESTADO_PAGO_PORTAL } from '../../../types/pagosPortal';
import type { PagoReserva } from '../../../types/pagos';
import { acompananteFormularioAPayload } from '../../../components/client/FormularioPasajeros/utils/acompanantePayload';
import {
  cargarBorradorReservaWizard,
  guardarBorradorReservaWizard,
  limpiarBorradorReservaWizard,
} from './borradorReservaWizard';
import './RegistrarPago.css';

interface InformacionPago {
  metodo: string;
  banco: string;
  referencia: string;
  monto: string;
  fecha: string;
  comprobanteArchivo: File | null;
}

function archivoABase64(archivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('No se pudo leer el comprobante.'));
    };
    reader.onerror = () => reject(new Error('No se pudo leer el comprobante.'));
    reader.readAsDataURL(archivo);
  });
}

function contarPuestosOcupados(datos: EstadoFormularioPasajeros | null): number {
  if (!datos) return 1;
  const acompanantesConAsiento = datos.pasajeros.filter((p) => !p.es_menor).length;
  return 1 + acompanantesConAsiento;
}

function pasoTrasErrorReserva(mensaje: string, pasoActual: number): number {
  const texto = mensaje.toLowerCase();
  if (texto.includes('reserva activa')) return 1;
  if (texto.includes('asiento')) return 2;
  if (texto.includes('domicilio') || texto.includes('recogida')) return 1;
  return pasoActual;
}

export default function RegistrarPago() {
  const navegar = useNavigate();
  const { viajePendiente, limpiarViajePendiente } = useReservas();
  const usuarioId = obtenerUsuarioSesion()?.id;
  const borradorGuardado =
    viajePendiente != null
      ? cargarBorradorReservaWizard(usuarioId, viajePendiente.viaje.id)
      : null;

  const [paso, setPaso] = useState(borradorGuardado?.paso ?? 1);
  const [datosPasajeros, setDatosPasajeros] = useState<EstadoFormularioPasajeros | null>(
    borradorGuardado?.datosPasajeros ?? null,
  );
  const [asientos, setAsientos] = useState<number[]>(borradorGuardado?.asientos ?? []);
  const [datosPago, setDatosPago] = useState<InformacionPago | null>(null);
  const [reservaId, setReservaId] = useState<number | null>(borradorGuardado?.reservaId ?? null);
  const [creandoReserva, setCreandoReserva] = useState(false);
  const [guardandoReserva, setGuardandoReserva] = useState(false);
  const [errorReserva, setErrorReserva] = useState<string | null>(null);
  const [pagoReportado, setPagoReportado] = useState<PagoReserva | null>(null);
  const [asientosGuardados, setAsientosGuardados] = useState(
    borradorGuardado?.asientosGuardados ?? false,
  );
  const [asientosViaje, setAsientosViaje] = useState<AsientoViaje[]>([]);
  const [cargandoAsientos, setCargandoAsientos] = useState(false);
  const [errorAsientos, setErrorAsientos] = useState<string | null>(null);

  const {
    resumenPortal,
    cargando: cargandoPagoPortal,
    error: errorPagoPortal,
    sinTasa,
    tasaId,
    cotizarMontoEur,
    reportar,
    obtenerBancoDestinoId,
    metodoPagoIdPorCodigo,
  } = usePagoPortal(reservaId);

  useEffect(() => {
    if (!viajePendiente) return;
    guardarBorradorReservaWizard(usuarioId, {
      viajeId: viajePendiente.viaje.id,
      paso,
      datosPasajeros,
      asientos,
      reservaId,
      asientosGuardados,
    });
  }, [usuarioId, viajePendiente, paso, datosPasajeros, asientos, reservaId, asientosGuardados]);

  const limpiarProgresoReserva = useCallback(() => {
    if (viajePendiente) {
      limpiarBorradorReservaWizard(usuarioId, viajePendiente.viaje.id);
    }
    limpiarViajePendiente();
  }, [usuarioId, viajePendiente, limpiarViajePendiente]);

  useEffect(() => {
    if (!viajePendiente && paso !== 4) {
      navegar('/client/agenda');
    }
  }, [viajePendiente, paso, navegar]);

  useEffect(() => {
    if (paso !== 2 || !viajePendiente) return;

    let activo = true;
    setCargandoAsientos(true);
    setErrorAsientos(null);

    obtenerAsientosDisponiblesPortal(viajePendiente.viaje.id)
      .then((respuesta) => {
        if (activo) setAsientosViaje(respuesta.asientos);
      })
      .catch((err) => {
        if (activo) {
          setErrorAsientos(
            err instanceof ErrorApi || err instanceof Error
              ? err.message
              : 'No se pudo cargar el mapa de asientos.',
          );
          setAsientosViaje([]);
        }
      })
      .finally(() => {
        if (activo) setCargandoAsientos(false);
      });

    return () => {
      activo = false;
    };
  }, [paso, viajePendiente?.viaje.id]);

  const asignarAsientosAReserva = useCallback(
    async (id: number) => {
      if (asientos.length === 0 || asientosGuardados) return;
      await asignarAsientosReservaPortal(id, asientos);
      setAsientosGuardados(true);
    },
    [asientos, asientosGuardados],
  );

  const aplicarErrorReserva = useCallback((msg: string, pasoActual: number) => {
    setErrorReserva(msg);
    const destino = pasoTrasErrorReserva(msg, pasoActual);
    if (destino === 2) {
      setAsientosGuardados(false);
    }
    if (destino !== pasoActual) {
      setPaso(destino);
    }
  }, []);

  const crearReservaSiFalta = useCallback(async () => {
    if (reservaId || !datosPasajeros || !viajePendiente) return reservaId;
    setCreandoReserva(true);
    setErrorReserva(null);
    try {
      const respuesta = await crearReservaCliente({
        viaje_id: viajePendiente.viaje.id,
        titular_punto_recogida_id: datosPasajeros.titularPuntoRecogidaId ?? null,
        titular_puntos_recogida: datosPasajeros.titularDomicilioNuevo
          ? [datosPasajeros.titularDomicilioNuevo]
          : undefined,
        pasajeros_extra: datosPasajeros.pasajeros.map((p) =>
          acompananteFormularioAPayload(p.ficha, p.es_menor, p.domicilio),
        ),
        asientos_ids: asientos.length > 0 ? asientos : undefined,
      });
      setReservaId(respuesta.reserva_id);
      if (asientos.length > 0) {
        setAsientosGuardados(true);
      }
      return respuesta.reserva_id;
    } catch (err) {
      const msg =
        err instanceof ErrorApi || err instanceof Error
          ? err.message
          : 'No se pudo crear la reserva. Verifique su conexión e intente de nuevo.';
      aplicarErrorReserva(msg, 3);
      return null;
    } finally {
      setCreandoReserva(false);
    }
  }, [reservaId, datosPasajeros, viajePendiente, asientos, aplicarErrorReserva]);

  useEffect(() => {
    if (paso === 3) {
      crearReservaSiFalta();
    }
  }, [paso, crearReservaSiFalta]);

  useEffect(() => {
    if (paso !== 3 || !reservaId || asientos.length === 0 || asientosGuardados) return;
    void asignarAsientosAReserva(reservaId).catch((err) => {
      const msg =
        err instanceof ErrorApi || err instanceof Error
          ? err.message
          : 'No se pudieron guardar los asientos seleccionados.';
      aplicarErrorReserva(msg, paso);
    });
  }, [paso, reservaId, asientos, asientosGuardados, asignarAsientosAReserva, aplicarErrorReserva]);

  if (!viajePendiente) return null;

  const { viaje, fecha } = viajePendiente;

  const fechaObj = new Date(fecha + 'T12:00:00');
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const fechaFormateada = `${fechaObj.getDate()} de ${meses[fechaObj.getMonth()]} de ${fechaObj.getFullYear()}`;

  const cantidadPuestos = contarPuestosOcupados(datosPasajeros);
  const adultos = cantidadPuestos;
  const menores = datosPasajeros?.pasajeros.filter((p) => p.es_menor).length ?? 0;
  const totalEstimado = adultos * viaje.precio + menores * (viaje.recargo_menor_eur ?? 0);

  const manejarEnvioPasajeros = (datos: EstadoFormularioPasajeros) => {
    setDatosPasajeros(datos);
    setAsientos([]);
    setAsientosGuardados(false);
    setReservaId(null);
    setErrorReserva(null);
    setPaso(2);
  };

  const manejarConfirmacionAsientos = (asientosSeleccionados: number[]) => {
    setAsientos(asientosSeleccionados);
    setAsientosGuardados(false);
    setPaso(3);
  };

  const manejarEnvioPago = async (datos: InformacionPago) => {
    setDatosPago(datos);
    setGuardandoReserva(true);
    setErrorReserva(null);

    try {
      const id = reservaId ?? (await crearReservaSiFalta());
      if (!id) return;

      if (!resumenPortal || !tasaId) {
        throw new Error('No hay tasa de cambio disponible para reportar el pago.');
      }

      const telefonoCliente = obtenerUsuarioSesion()?.telefono?.replace(/\D/g, '') ?? null;

      let comprobanteUrl: string | null = null;
      if (datos.comprobanteArchivo) {
        comprobanteUrl = await archivoABase64(datos.comprobanteArchivo);
      }

      const payload = await construirReportePagoPortal({
        resumenPortal,
        datos,
        tasaId,
        metodoPagoIdPorCodigo: (codigo) => metodoPagoIdPorCodigo(codigo),
        cotizarMontoEur,
        obtenerBancoDestinoId,
        comprobanteUrl,
        telefonoCliente,
      });

      const respuestaReporte = await reportar(payload);

      setPagoReportado(respuestaReporte.pago);
      if (viajePendiente) {
        limpiarBorradorReservaWizard(usuarioId, viajePendiente.viaje.id);
      }
      setPaso(4);
    } catch (err) {
      const msg =
        err instanceof ErrorApi || err instanceof Error
          ? err.message
          : 'No se pudo registrar el pago. Verifique su conexión e intente de nuevo.';
      setErrorReserva(msg);
    } finally {
      setGuardandoReserva(false);
    }
  };

  const manejarCancelar = () => {
    limpiarProgresoReserva();
    navegar('/client/agenda');
  };

  const manejarIrMisViajes = () => {
    limpiarProgresoReserva();
    navegar('/client/dashboard');
  };

  const procesando = guardandoReserva || creandoReserva || (paso === 3 && cargandoPagoPortal && !resumenPortal);
  const errorVisible = errorReserva || (paso === 3 ? errorPagoPortal : null);

  const totalBsReserva = resumenPortal ? montoBsTotalReserva(resumenPortal) : null;
  const saldoBsPendiente = resumenPortal ? montoBsSaldoPendiente(resumenPortal) : null;
  const montoInicialBs = resumenPortal ? montoBsSugerido(resumenPortal) : null;
  const depositoMinimoEur =
    resumenPortal?.resumen.deposito_minimo_eur ?? resumenPortal?.deposito_minimo_eur ?? 5;
  const tasaValor = resumenPortal?.tasa_eur?.valor ?? null;

  return (
    <div className="registrar-pago">

      <div className="ticket">
        <div className="ticket__header">
          <span className="ticket__tag">Viaje próximo</span>
          <div className={`ticket__badge ${paso === 4 ? 'ticket__badge--confirmed' : 'ticket__badge--pending'}`}>
            {paso === 4 ? 'Confirmado' : 'Pago pendiente'}
          </div>
        </div>

        <div className="ticket__route">
          <div className="ticket__point">
            <span className="ticket__point-code">BQT</span>
            <span className="ticket__point-name">Barquisimeto</span>
          </div>
          <div className="ticket__route-line">
            <span className="ticket__route-dot"></span>
            <span className="ticket__route-dash"></span>
            <span className="ticket__route-icon" aria-hidden="true">—</span>
            <span className="ticket__route-dash"></span>
            <span className="ticket__route-dot"></span>
          </div>
          <div className="ticket__point">
            <span className="ticket__point-code">{viaje.titulo.substring(0, 3).toUpperCase()}</span>
            <span className="ticket__point-name">{viaje.titulo}</span>
          </div>
        </div>

        <div className="ticket__tear">
          <span className="ticket__notch ticket__notch--left"></span>
          <span className="ticket__tear-line"></span>
          <span className="ticket__notch ticket__notch--right"></span>
        </div>

        <div className="ticket__details">
          <div className="ticket__detail">
            <span className="ticket__detail-label">Fecha</span>
            <span className="ticket__detail-value">{fechaFormateada}</span>
          </div>
          <div className="ticket__detail">
            <span className="ticket__detail-label">Hora</span>
            <span className="ticket__detail-value">{viaje.hora}</span>
          </div>
          <div className="ticket__detail">
            <span className="ticket__detail-label">Precio</span>
            <span className="ticket__detail-value">${viaje.precio}/p</span>
          </div>
        </div>
      </div>

      <div className="registrar-pago__stepper">
        <div className={`registrar-pago__step ${paso >= 1 ? 'registrar-pago__step--active' : ''} ${paso > 1 ? 'registrar-pago__step--completed' : ''}`}>
          <div className="registrar-pago__step-number">1</div>
          <div className="registrar-pago__step-label">Pasajeros</div>
        </div>
        <div className="registrar-pago__step-connector" />
        <div className={`registrar-pago__step ${paso >= 2 ? 'registrar-pago__step--active' : ''} ${paso > 2 ? 'registrar-pago__step--completed' : ''}`}>
          <div className="registrar-pago__step-number">2</div>
          <div className="registrar-pago__step-label">Asientos</div>
        </div>
        <div className="registrar-pago__step-connector" />
        <div className={`registrar-pago__step ${paso >= 3 ? 'registrar-pago__step--active' : ''} ${paso > 3 ? 'registrar-pago__step--completed' : ''}`}>
          <div className="registrar-pago__step-number">3</div>
          <div className="registrar-pago__step-label">Pago</div>
        </div>
        <div className="registrar-pago__step-connector" />
        <div className={`registrar-pago__step ${paso >= 4 ? 'registrar-pago__step--active' : ''}`}>
          <div className="registrar-pago__step-number">4</div>
          <div className="registrar-pago__step-label">Confirmación</div>
        </div>
      </div>

      <div className="registrar-pago__content-area" style={{ position: 'relative' }}>
        {procesando && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, borderRadius: '12px' }}>
            <span style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-sans)', fontWeight: 600 }}>
              {guardandoReserva ? 'Registrando pago…' : creandoReserva ? 'Preparando reserva…' : 'Cargando datos de pago…'}
            </span>
          </div>
        )}
        {errorVisible && (
          <div style={{ marginBottom: '1rem', padding: '0.875rem 1rem', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', color: 'var(--color-error)', fontSize: '0.875rem', fontFamily: 'var(--font-sans)' }}>
            {errorVisible}
          </div>
        )}

        {paso === 1 && (
          <FormularioPasajeros
            viajeId={viaje.id}
            recargo_menor_eur={viaje.recargo_menor_eur ?? 0}
            estadoInicial={datosPasajeros}
            onSubmit={manejarEnvioPasajeros}
            onBack={manejarCancelar}
          />
        )}

        {paso === 2 && (
          <>
            {errorAsientos && (
              <div style={{ marginBottom: '1rem', padding: '0.875rem 1rem', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', color: 'var(--color-error)', fontSize: '0.875rem' }}>
                {errorAsientos}
              </div>
            )}
            {cargandoAsientos ? (
              <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem' }}>
                Cargando mapa de asientos…
              </p>
            ) : asientosViaje.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem' }}>
                No hay asientos disponibles para este viaje.
              </p>
            ) : (
              <MapaAsientos
                cantidadPuestos={cantidadPuestos}
                asientos={asientosViaje}
                alConfirmar={manejarConfirmacionAsientos}
                alRegresar={() => setPaso(1)}
              />
            )}
          </>
        )}

        {paso === 3 && (
          <FormularioPago
            totalEstimado={totalEstimado}
            totalReservaEur={resumenPortal?.resumen.total_reserva_eur}
            saldoPendienteEur={resumenPortal?.resumen.saldo_pendiente_eur}
            totalBsReserva={totalBsReserva}
            saldoBsPendiente={saldoBsPendiente}
            montoInicialBs={montoInicialBs}
            depositoMinimoEur={depositoMinimoEur}
            tasaValor={tasaValor}
            adultos={adultos}
            menores={menores}
            precioBase={viaje.precio}
            recargoMenor={viaje.recargo_menor_eur ?? 0}
            bancos={resumenPortal?.bancos}
            sinTasa={sinTasa}
            cargandoResumen={cargandoPagoPortal && !resumenPortal}
            onSubmit={manejarEnvioPago}
            onBack={() => setPaso(2)}
          />
        )}

        {paso === 4 && datosPago && (
          <div className="receipt-ticket">
            <div className="receipt-ticket__celebration">
              <h2 className="receipt-ticket__title">Registro completado</h2>
              <p className="receipt-ticket__subtitle">
                Tu boleto ha sido emitido exitosamente
              </p>
            </div>

            <div className="receipt-ticket__tear">
              <span className="receipt-ticket__notch receipt-ticket__notch--left"></span>
              <span className="receipt-ticket__tear-line"></span>
              <span className="receipt-ticket__notch receipt-ticket__notch--right"></span>
            </div>

            <div className="receipt-ticket__itinerary">
              <h3 className="receipt-ticket__section-title">Itinerario del Viaje</h3>
              <div className="receipt-ticket__timeline">
                <div className="receipt-ticket__timeline-item">
                  <span className="receipt-ticket__timeline-time">{viaje.hora}</span>
                  <div className="receipt-ticket__timeline-marker">
                    <span className="receipt-ticket__timeline-dot"></span>
                    <span className="receipt-ticket__timeline-line"></span>
                  </div>
                  <div className="receipt-ticket__timeline-info">
                    <span className="receipt-ticket__timeline-place">Barquisimeto</span>
                    <span className="receipt-ticket__timeline-detail">Terminal Privado TravelBqto</span>
                  </div>
                </div>
                <div className="receipt-ticket__timeline-item">
                  <span className="receipt-ticket__timeline-time">—</span>
                  <div className="receipt-ticket__timeline-marker">
                    <span className="receipt-ticket__timeline-dot receipt-ticket__timeline-dot--end"></span>
                  </div>
                  <div className="receipt-ticket__timeline-info">
                    <span className="receipt-ticket__timeline-place">{viaje.titulo}</span>
                    <span className="receipt-ticket__timeline-detail">{viaje.ubicacion}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="receipt-ticket__invoice">
              <div className="receipt-ticket__invoice-row">
                <span className="receipt-ticket__invoice-label">Asientos</span>
                <span className="receipt-ticket__invoice-value receipt-ticket__invoice-value--highlight">
                  {asientos.sort((a, b) => a - b).join(', ')}
                </span>
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
                <span className="receipt-ticket__invoice-label">Monto reportado</span>
                <span className="receipt-ticket__invoice-value receipt-ticket__invoice-value--total">
                  {formatearBs(parseFloat(datosPago.monto))}
                </span>
              </div>
              {resumenPortal && !resumenPortal.resumen.pagado_completo && (
                <div className="receipt-ticket__invoice-row">
                  <span className="receipt-ticket__invoice-label">Saldo pendiente</span>
                  <span className="receipt-ticket__invoice-value">
                    {formatearEuro(resumenPortal.resumen.saldo_pendiente_eur)}
                  </span>
                </div>
              )}
            </div>

            <div className="receipt-ticket__status-bar">
              <span className="receipt-ticket__status-dot"></span>
              <span className="receipt-ticket__status-text">
                {pagoReportado?.estado_etiqueta ??
                  ETIQUETA_ESTADO_PAGO_PORTAL[pagoReportado?.estado ?? 'en_validacion']}
              </span>
            </div>

            <div className="receipt-ticket__tear">
              <span className="receipt-ticket__notch receipt-ticket__notch--left"></span>
              <span className="receipt-ticket__tear-line"></span>
              <span className="receipt-ticket__notch receipt-ticket__notch--right"></span>
            </div>

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

            <div className="receipt-ticket__actions">
              <Boton type="button" variante="secundario" onClick={manejarCancelar}>
                Explorar más viajes
              </Boton>
              <Boton type="button" variante="primario" onClick={manejarIrMisViajes}>
                Ver mis viajes
              </Boton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
