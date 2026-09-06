import { Link } from 'react-router-dom';
import { useState } from 'react';
import PaginacionTabla from '../../../components/admin/PaginacionTabla/PaginacionTabla';
import ModalDetallePagoPortal from '../../../components/client/DetallePagoPortal/ModalDetallePagoPortal';
import { useMisViajesPortal } from '../../../hooks/useMisViajesPortal';
import type { EstadoPago } from '../../../types/pagos';
import { ETIQUETA_ESTADO_PAGO_PORTAL } from '../../../types/pagosPortal';
import {
  formatearMontoPortalPago,
  ultimoPagoReserva,
} from '../../../services/pagosPortal';
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

const IMAGEN_VIAJE_FALLBACK =
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80';

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
  } = useMisViajesPortal();
  const [detallePago, setDetallePago] = useState<{ reservaId: number; pagoId: number } | null>(
    null,
  );

  return (
    <div className="mis-viajes">
      <div className="mis-viajes__header">
        <div>
          <h1 className="mis-viajes__titulo">Mis viajes</h1>
          <p className="mis-viajes__subtitulo">
            Gestiona tus reservas y revisa el estado de tus pagos.
          </p>
        </div>
        <Link to="/agenda" className="mis-viajes__btn-explorar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Explorar agenda
        </Link>
      </div>

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
            Explora la agenda de experiencias y reserva tu próxima aventura.
          </p>
          <Link to="/agenda" className="mis-viajes__vacio-btn">
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
            const saldoPendiente = reserva.resumen_pagos?.saldo_pendiente_eur ?? 0;
            const pagadoCompleto = reserva.resumen_pagos?.pagado_completo ?? false;
            const mostrarAbonar = !pagadoCompleto && saldoPendiente > 0.01;

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
                  style={{
                    backgroundImage: `url(${reserva.destino_imagen || IMAGEN_VIAJE_FALLBACK})`,
                  }}
                />

                <div className="mis-viajes__ticket-body">
                  <div className="mis-viajes__ticket-top">
                    <h3 className="mis-viajes__ticket-titulo">
                      {reserva.destino_nombre ?? `Reserva #${reserva.id}`}
                    </h3>
                    <span className={`mis-viajes__badge ${badge.clase}`}>{badge.label}</span>
                  </div>

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
                      Ref: {pago?.referencia ?? '—'}
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
                      <span className="mis-viajes__ticket-id">RES-{reserva.id}</span>
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
