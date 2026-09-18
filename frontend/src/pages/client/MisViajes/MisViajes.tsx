import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import PaginacionTabla from '../../../components/admin/PaginacionTabla/PaginacionTabla';
import ModalDetallePagoPortal from '../../../components/client/DetallePagoPortal/ModalDetallePagoPortal';
import { useMisViajesPortal } from '../../../hooks/useMisViajesPortal';
import type { EstadoPago } from '../../../types/pagos';
import { ETIQUETA_ESTADO_PAGO_PORTAL } from '../../../types/pagosPortal';
import {
  formatearMontoPortalPago,
  puedeAbonarReserva,
  saldoDisponibleEurResumen,
  ultimoPagoReserva,
} from '../../../services/pagosPortal';
import { aplicarCreditoPortal, obtenerMisCreditos, type ResumenCreditos } from '../../../services/creditos';
import { formatearEuro } from '../../../utils/formatoMoneda';
import './MisViajes.css';

const BADGE_PAGO: Record<
  EstadoPago,
  { label: string; clase: string }
> = {
  en_validacion: {
    label: ETIQUETA_ESTADO_PAGO_PORTAL.en_validacion,
    clase: 'mis-viajes__badge--pendiente',
  },
  aprobado: {
    label: ETIQUETA_ESTADO_PAGO_PORTAL.aprobado,
    clase: 'mis-viajes__badge--aprobado',
  },
  rechazado: {
    label: ETIQUETA_ESTADO_PAGO_PORTAL.rechazado,
    clase: 'mis-viajes__badge--rechazado',
  },
};

function formatearFecha(fechaISO: string): string {
  const d = new Date(fechaISO.includes('T') ? fechaISO : `${fechaISO}T12:00:00`);
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${d.getDate()} de ${meses[d.getMonth()]} ${d.getFullYear()}`;
}

export default function MisViajes() {
  const {
    reservas,
    pagos,
    cargando,
    error,
    pagina,
    total,
    totalPaginas,
    limite,
    irPagina,
    recargar,
  } = useMisViajesPortal();
  const [detallePago, setDetallePago] = useState<{ reservaId: number; pagoId: number } | null>(
    null,
  );
  const [creditos, setCreditos] = useState<ResumenCreditos | null>(null);
  const [aplicandoCredito, setAplicandoCredito] = useState<number | null>(null);
  const [mensajeCredito, setMensajeCredito] = useState<string | null>(null);

  const cargarCreditos = async () => {
    try {
      setCreditos(await obtenerMisCreditos());
    } catch {
      setCreditos(null);
    }
  };

  useEffect(() => {
    void cargarCreditos();
  }, []);

  const manejarAplicarCredito = async (reservaId: number) => {
    setAplicandoCredito(reservaId);
    setMensajeCredito(null);
    try {
      const respuesta = await aplicarCreditoPortal(reservaId);
      setMensajeCredito(respuesta.mensaje || `Se aplicaron ${formatearEuro(respuesta.aplicado_eur)} a tu reserva.`);
      await Promise.all([recargar(), cargarCreditos()]);
    } catch (err) {
      setMensajeCredito(err instanceof Error ? err.message : 'No se pudo aplicar el saldo a favor.');
    } finally {
      setAplicandoCredito(null);
    }
  };

  return (
    <div className="mis-viajes">
      <div className="mis-viajes__header">
        <div>
          <h1 className="mis-viajes__titulo">Mis viajes</h1>
          <p className="mis-viajes__subtitulo">
            Tus reservas, pagos y boleto de cada salida.
          </p>
        </div>
        <Link to="/client/agenda" className="mis-viajes__btn-explorar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Explorar agenda
        </Link>
      </div>

      {creditos && creditos.saldo_disponible_eur > 0.01 && (
        <div className="mis-viajes__credito" role="status">
          <strong>Saldo a favor: {formatearEuro(creditos.saldo_disponible_eur)}</strong>
          <span>{creditos.politica}</span>
        </div>
      )}
      {mensajeCredito && (
        <div className="mis-viajes__error" role="status">
          {mensajeCredito}
        </div>
      )}

      {error && (
        <div className="mis-viajes__error" role="alert">
          {error}
        </div>
      )}

      {cargando ? (
        <p className="mis-viajes__cargando">Cargando tus reservas…</p>
      ) : reservas.length === 0 ? (
        <div className="mis-viajes__vacio">
          <h3 className="mis-viajes__vacio-titulo">Aún no tienes viajes</h3>
          <p className="mis-viajes__vacio-desc">
            Abre el calendario y reserva un asiento para tu próximo viaje.
          </p>
          <Link to="/client/agenda" className="mis-viajes__vacio-btn">
            Ver calendario de viajes
          </Link>
        </div>
      ) : (
        <div className="mis-viajes__lista">
          {reservas.map((reserva) => {
            const pago = ultimoPagoReserva(pagos, reserva.id);
            const badge = pago
              ? {
                  label: pago.estado_etiqueta || BADGE_PAGO[pago.estado].label,
                  clase: BADGE_PAGO[pago.estado].clase,
                }
              : {
                  label: 'Sin pago reportado',
                  clase: 'mis-viajes__badge--pendiente',
                };
            const asientos = (reserva.asientos ?? []).slice();
            const montoTexto = pago
              ? `${formatearMontoPortalPago(pago)} · ${formatearEuro(pago.monto_eur)}`
              : reserva.resumen_pagos?.total_reserva_eur
                ? formatearEuro(reserva.resumen_pagos.total_reserva_eur)
                : '—';
            const saldoPendiente = reserva.resumen_pagos
              ? saldoDisponibleEurResumen(reserva.resumen_pagos)
              : 0;
            const mostrarAbonar = puedeAbonarReserva(reserva.resumen_pagos);

            return (
              <article
                key={reserva.id}
                className="mis-viajes__ticket"
                onClick={() => {
                  if (pago) setDetallePago({ reservaId: reserva.id, pagoId: pago.id });
                }}
                onKeyDown={(e) => {
                  if (pago && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    setDetallePago({ reservaId: reserva.id, pagoId: pago.id });
                  }
                }}
                role={pago ? 'button' : undefined}
                tabIndex={pago ? 0 : undefined}
                style={pago ? { cursor: 'pointer' } : undefined}
              >
                <div
                  className="mis-viajes__ticket-img"
                  style={
                    reserva.destino_imagen
                      ? { backgroundImage: `url(${reserva.destino_imagen})` }
                      : undefined
                  }
                />

                <div className="mis-viajes__ticket-body">
                  <div className="mis-viajes__ticket-top">
                    <h3 className="mis-viajes__ticket-titulo">
                      {reserva.destino_nombre ?? 'Tu viaje'}
                    </h3>
                    <span className={`mis-viajes__badge ${badge.clase}`}>{badge.label}</span>
                  </div>
                  {reserva.plazo_correccion && !reserva.plazo_correccion.vencido && pago?.estado === 'rechazado' && (
                    <p className="mis-viajes__ticket-ubicacion">
                      Tienes {reserva.plazo_correccion.minutos_restantes >= 60
                        ? `${Math.floor(reserva.plazo_correccion.minutos_restantes / 60)} h`
                        : `${reserva.plazo_correccion.minutos_restantes} min`}{' '}
                      para corregir el pago. Si no, se liberan los cupos.
                    </p>
                  )}

                  {reserva.ubicacion && (
                    <p className="mis-viajes__ticket-ubicacion">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      {reserva.ubicacion}
                    </p>
                  )}

                  <div className="mis-viajes__ticket-detalles">
                    <div className="mis-viajes__ticket-dato">
                      <span className="mis-viajes__ticket-dato-label">Fecha</span>
                      <span className="mis-viajes__ticket-dato-value">
                        {reserva.fecha_salida ? formatearFecha(reserva.fecha_salida) : '—'}
                      </span>
                    </div>
                    <div className="mis-viajes__ticket-dato">
                      <span className="mis-viajes__ticket-dato-label">Hora</span>
                      <span className="mis-viajes__ticket-dato-value">
                        {reserva.hora_salida ?? '—'}
                      </span>
                    </div>
                    <div className="mis-viajes__ticket-dato">
                      <span className="mis-viajes__ticket-dato-label">Asientos</span>
                      <span className="mis-viajes__ticket-dato-value">
                        {asientos.length > 0 ? asientos.join(', ') : '—'}
                      </span>
                    </div>
                    <div className="mis-viajes__ticket-dato">
                      <span className="mis-viajes__ticket-dato-label">Monto</span>
                      <span className="mis-viajes__ticket-dato-value">{montoTexto}</span>
                    </div>
                    {mostrarAbonar && (
                      <div className="mis-viajes__ticket-dato">
                        <span className="mis-viajes__ticket-dato-label">Saldo</span>
                        <span className="mis-viajes__ticket-dato-value mis-viajes__ticket-dato-value--saldo">
                          {formatearEuro(saldoPendiente)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mis-viajes__ticket-footer">
                    <span className="mis-viajes__ticket-ref">
                      {reserva.boleto?.codigo
                        ? `Boleto ${reserva.boleto.codigo}`
                        : `Ref: ${pago?.referencia ?? '—'}`}
                    </span>
                    <div className="mis-viajes__ticket-footer-actions">
                      {mostrarAbonar && (
                        <Link
                          to={`/client/reservas/${reserva.id}/abonar`}
                          className="mis-viajes__btn-abonar"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Abonar saldo
                        </Link>
                      )}
                      {mostrarAbonar && (creditos?.saldo_disponible_eur ?? 0) > 0.01 && reserva.estado !== 'cancelada' && (
                        <button
                          type="button"
                          className="mis-viajes__btn-abonar"
                          disabled={aplicandoCredito === reserva.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            void manejarAplicarCredito(reserva.id);
                          }}
                        >
                          {aplicandoCredito === reserva.id ? 'Aplicando…' : 'Usar saldo a favor'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {!cargando && reservas.length > 0 && (
        <PaginacionTabla
          pagina={pagina}
          totalPaginas={totalPaginas}
          total={total}
          limite={limite}
          onPaginaChange={irPagina}
        />
      )}

      <ModalDetallePagoPortal
        abierto={detallePago != null}
        reservaId={detallePago?.reservaId ?? null}
        pagoId={detallePago?.pagoId ?? null}
        onCerrar={() => setDetallePago(null)}
      />
    </div>
  );
}
