import { useState } from 'react';
import { PanelDeslizable, EtiquetaEstado } from '../../../../components/admin';
import Boton from '../../../../components/ui/Boton/Boton';
import type { ReservaEnriquecida, ReservaCliente } from '../../../../types/reservas';
import { etiquetaEstado, SIN_DATO, textoVisible } from '../../../../utils/etiquetasNegocio';
import { formatearEuro } from '../../../../utils/formatoMoneda';
import { nombreCompleto } from '../../../../utils/nombrePersona';
import { resolverUrlArchivo } from '../../../../utils/resolverUrlArchivo';
import PagosReserva from '../Pagos/PagosReserva';
import {
  aplicarCreditoAdmin,
  cancelarReservaSinReembolso,
  obtenerCreditosAdmin,
  saldoCreditos,
} from '../../../../services/creditos';

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  reservaActiva: ReservaEnriquecida | null;
  pasajerosActivos: ReservaCliente[];
  cargandoDetalles: boolean;
  puedeGestionar?: boolean;
  onReservaActualizada?: () => void;
}

const ESTADO_VARIANTE: Record<string, 'neutro' | 'info' | 'exito' | 'error' | 'advertencia'> = {
  pendiente: 'advertencia',
  confirmada: 'exito',
  abonada: 'info',
  cancelada: 'error',
};

function IconViaje() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" rx="2" />
      <path d="M16 8h4l3 5v3h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}

function IconPasajero() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function IconPin() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function IconPago() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="detalle-rsv__seccion-titulo">
      <span className="detalle-rsv__seccion-titulo__icon">{icon}</span>
      {children}
    </div>
  );
}

export default function PanelDetalleReserva({
  abierto,
  onCerrar,
  reservaActiva,
  pasajerosActivos,
  cargandoDetalles,
  puedeGestionar = false,
  onReservaActualizada,
}: Props) {
  const [accionando, setAccionando] = useState(false);
  const [mensajeAccion, setMensajeAccion] = useState<string | null>(null);
  const [confirmarCancelar, setConfirmarCancelar] = useState(false);
  const total = pasajerosActivos.reduce(
    (sum, p) => sum + (p.precio_pasajero_eur ?? 0) + (p.recargo_eur ?? 0),
    0,
  );

  const fechaReserva = reservaActiva
    ? new Date(reservaActiva.fecha_reserva).toLocaleDateString('es-VE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '';

  const fechaSalida = reservaActiva?.viajeObj
    ? new Date(reservaActiva.viajeObj.fecha_salida).toLocaleDateString('es-VE', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—';

  const etiquetaModalidad: Record<string, string> = {
    individual: 'Individual',
    grupo: 'Grupo',
    propio: 'Propio',
  };
  const etiquetaHospedaje: Record<string, string> = {
    compartido: 'Compartido',
    particular: 'Particular',
  };

  const cancelable = Boolean(
    puedeGestionar && reservaActiva && reservaActiva.estado !== 'cancelada',
  );

  const manejarCancelar = async () => {
    if (!reservaActiva) return;
    setAccionando(true);
    setMensajeAccion(null);
    try {
      const respuesta = await cancelarReservaSinReembolso(reservaActiva.id);
      setConfirmarCancelar(false);
      setMensajeAccion(
        respuesta.mensaje ||
          'Reserva cancelada. No hay reembolso en efectivo; el saldo queda a favor para reubicar.',
      );
      onReservaActualizada?.();
    } catch (err) {
      setMensajeAccion(err instanceof Error ? err.message : 'No se pudo cancelar la reserva.');
    } finally {
      setAccionando(false);
    }
  };

  const manejarAplicarCredito = async () => {
    if (!reservaActiva) return;
    setAccionando(true);
    setMensajeAccion(null);
    try {
      const creditos = await obtenerCreditosAdmin(reservaActiva.cliente_id);
      if (saldoCreditos(creditos.items) <= 0.01) {
        setMensajeAccion('Este cliente no tiene saldo a favor disponible.');
        return;
      }
      const respuesta = await aplicarCreditoAdmin(reservaActiva.id);
      setMensajeAccion(
        respuesta.mensaje ||
          `Se aplicaron ${formatearEuro(respuesta.aplicado_eur)} de saldo a favor.`,
      );
      onReservaActualizada?.();
    } catch (err) {
      setMensajeAccion(err instanceof Error ? err.message : 'No se pudo aplicar el saldo a favor.');
    } finally {
      setAccionando(false);
    }
  };

  return (
    <PanelDeslizable
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={
        reservaActiva
          ? textoVisible(reservaActiva.viajeObj?.destino_nombre, 'Detalle de reserva')
          : 'Detalle de reserva'
      }
      subtitulo={
        reservaActiva?.clienteObj
          ? nombreCompleto(reservaActiva.clienteObj.nombre, reservaActiva.clienteObj.apellido)
          : reservaActiva
          ? SIN_DATO.cliente
          : ''
      }
      ancho="lg"
      pie={
        <Boton variante="secundario" tamano="sm" onClick={onCerrar}>
          Cerrar
        </Boton>
      }
    >
      {!reservaActiva ? null : (
        <div className="drawer-form">

          {/* ── Estado + fecha de creación ── */}
          <div className="detalle-rsv__estado-row">
            <EtiquetaEstado
              etiqueta={reservaActiva.estado}
              variante={ESTADO_VARIANTE[reservaActiva.estado] ?? 'neutro'}
            />
            <span className="detalle-rsv__fecha-rsv">
              <IconCalendar />
              Reservada el {fechaReserva}
            </span>
          </div>

          {/* ── Información del viaje ── */}
          <div className="detalle-rsv__seccion">
            <SectionTitle icon={<IconViaje />}>Viaje</SectionTitle>
            <div className="drawer-form__ficha">
              <div className="drawer-form__ficha-item">
                <span className="drawer-form__ficha-etiqueta">Destino</span>
                <strong>{textoVisible(reservaActiva.viajeObj?.destino_nombre, SIN_DATO.viaje)}</strong>
              </div>
              <div className="drawer-form__ficha-item">
                <span className="drawer-form__ficha-etiqueta">Fecha de salida</span>
                <strong>{fechaSalida}</strong>
              </div>
              <div className="drawer-form__ficha-item">
                <span className="drawer-form__ficha-etiqueta">Unidad (placa)</span>
                <strong>{reservaActiva.viajeObj?.unidad_placa ?? '—'}</strong>
              </div>
              <div className="drawer-form__ficha-item">
                <span className="drawer-form__ficha-etiqueta">Guía asignado</span>
                <strong>{reservaActiva.viajeObj?.guia_nombre ?? '—'}</strong>
              </div>
              {reservaActiva.viajeObj?.precio_base != null && (
                <div className="drawer-form__ficha-item">
                  <span className="drawer-form__ficha-etiqueta">Precio base</span>
                  <strong>{formatearEuro(reservaActiva.viajeObj.precio_base)}</strong>
                </div>
              )}
              <div className="drawer-form__ficha-item">
                <span className="drawer-form__ficha-etiqueta">Modalidad</span>
                <strong>{etiquetaModalidad[reservaActiva.modalidad ?? ''] ?? reservaActiva.modalidad ?? '—'}</strong>
              </div>
              <div className="drawer-form__ficha-item">
                <span className="drawer-form__ficha-etiqueta">Hospedaje</span>
                <strong>{etiquetaHospedaje[reservaActiva.tipo_hospedaje ?? ''] ?? reservaActiva.tipo_hospedaje ?? '—'}</strong>
              </div>
              <div className="drawer-form__ficha-item">
                <span className="drawer-form__ficha-etiqueta">Estado del viaje</span>
                <span className={`detalle-rsv__viaje-estado detalle-rsv__viaje-estado--${reservaActiva.viajeObj?.estado ?? 'sin_estado'}`}>
                  {etiquetaEstado(reservaActiva.viajeObj?.estado)}
                </span>
              </div>
            </div>
          </div>

          {/* ── Manifiesto de pasajeros ── */}
          <div className="detalle-rsv__seccion">
            <SectionTitle icon={<IconPasajero />}>
              Manifiesto
              <span className="detalle-rsv__count">{pasajerosActivos.length}</span>
            </SectionTitle>

            {cargandoDetalles ? (
              <div className="detalle-rsv__cargando">Cargando pasajeros...</div>
            ) : pasajerosActivos.length === 0 ? (
              <div className="detalle-rsv__vacio">Sin pasajeros registrados en esta reserva.</div>
            ) : (
              <div className="detalle-rsv__pasajeros">
                {pasajerosActivos.map((p, i) => {
                  const esTitular = p.es_titular;

                  return (
                    <div key={p.id} className="detalle-rsv__pasajero">
                      {/* Cabecera del pasajero */}
                      <div className="detalle-rsv__pasajero-header">
                        <div className="detalle-rsv__pasajero-ident">
                          <span className="detalle-rsv__pasajero-num">{i + 1}</span>
                          <div>
                            <span className="detalle-rsv__pasajero-nombre">
                              {nombreCompleto(p.nombre, p.apellido)}
                            </span>
                            <span className="detalle-rsv__pasajero-doc">
                              {p.tipo_documento}-{p.numero_documento}
                            </span>
                          </div>
                        </div>
                        <div className="detalle-rsv__pasajero-badges">
                          {esTitular && (
                            <span className="detalle-rsv__badge detalle-rsv__badge--titular">Titular</span>
                          )}
                          {p.es_menor && (
                            <span className="detalle-rsv__badge detalle-rsv__badge--menor">Menor</span>
                          )}
                          {!p.ocupa_asiento && (
                            <span className="detalle-rsv__badge detalle-rsv__badge--sin-asiento">Sin asiento</span>
                          )}
                        </div>
                      </div>

                      {/* Punto de recogida */}
                      {p.punto_recogida_nombre && (
                        <div className="detalle-rsv__pasajero-recogida">
                          <IconPin />
                          <span>{p.punto_recogida_nombre}</span>
                        </div>
                      )}

                      {/* Tarifa */}
                      <div className="detalle-rsv__pasajero-tarifa">
                        <span className="detalle-rsv__pasajero-precio">
                          {formatearEuro(p.precio_pasajero_eur ?? 0)}
                        </span>
                        {(p.recargo_eur ?? 0) > 0 && (
                          <span className="detalle-rsv__pasajero-recargo">
                            +{formatearEuro(p.recargo_eur)} recargo
                          </span>
                        )}
                        {p.notas_tarifa && (
                          <span className="detalle-rsv__pasajero-nota">{p.notas_tarifa}</span>
                        )}
                        {p.es_menor && p.partida_nacimiento_url && (
                          <a
                            href={resolverUrlArchivo(p.partida_nacimiento_url)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Partida de nacimiento
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Total estimado ── */}
          {!cargandoDetalles && pasajerosActivos.length > 0 && (
            <div className="detalle-rsv__total">
              <span className="detalle-rsv__total-label">Total estimado</span>
              <span className="detalle-rsv__total-valor">{formatearEuro(total)}</span>
            </div>
          )}

          {/* ── Pagos ── */}
          <div className="detalle-rsv__seccion">
            <SectionTitle icon={<IconPago />}>Pagos</SectionTitle>
            <PagosReserva reservaId={reservaActiva.id} activo={abierto} />
          </div>

          {puedeGestionar && (
            <div className="detalle-rsv__seccion">
              <SectionTitle icon={<IconPago />}>Saldo a favor</SectionTitle>
              <p className="paso-aviso-cliente" style={{ marginBottom: 12 }}>
                No hay reembolso en efectivo. Si el cliente no viaja, el monto pagado queda como saldo a favor para reubicarlo en otro viaje.
              </p>
              {mensajeAccion && (
                <div className="detalle-rsv__vacio" role="status" style={{ marginBottom: 12 }}>
                  {mensajeAccion}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Boton
                  variante="secundario"
                  tamano="sm"
                  disabled={accionando || reservaActiva.estado === 'cancelada'}
                  onClick={() => void manejarAplicarCredito()}
                >
                  Aplicar saldo a favor
                </Boton>
                {cancelable && !confirmarCancelar && (
                  <Boton
                    variante="peligro"
                    tamano="sm"
                    disabled={accionando}
                    onClick={() => setConfirmarCancelar(true)}
                  >
                    Cancelar sin reembolso
                  </Boton>
                )}
              </div>
              {confirmarCancelar && (
                <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Boton
                    variante="peligro"
                    tamano="sm"
                    disabled={accionando}
                    onClick={() => void manejarCancelar()}
                  >
                    Confirmar cancelación
                  </Boton>
                  <Boton
                    variante="secundario"
                    tamano="sm"
                    disabled={accionando}
                    onClick={() => setConfirmarCancelar(false)}
                  >
                    Volver
                  </Boton>
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </PanelDeslizable>
  );
}
