import apiRequest from './api';
import { apiMutacion } from '../utils/notificacionesEventos';
import type { PaginacionQuery, RespuestaPaginada } from '../types/paginacion';
import { LIMITE_PAGINA_PORTAL_RESERVAS } from '../types/paginacion';
import { agregarPaginacionAParams, normalizarRespuestaPaginada } from '../utils/paginacionApi';
import { resolverUrlArchivo } from '../utils/resolverUrlArchivo';
import {
  DEPOSITO_MINIMO_EUR,
  METODOS_PAGO_PORTAL,
  type CotizarPagoPortalParams,
  type CotizarPagoPortalRespuesta,
  type MetodoPagoPortalCodigo,
  type PagoPortalDetalle,
  type PagoPortalMis,
  type ReportarPagoPortalDTO,
  type ReportarPagoPortalRespuesta,
  type ReservaPortalMis,
  type ResumenPagoPortal,
} from '../types/pagosPortal';

function esMetodoPortalPermitido(codigo: string): codigo is MetodoPagoPortalCodigo {
  return (METODOS_PAGO_PORTAL as readonly string[]).includes(codigo);
}

function filtrarMetodosPortal(resumen: ResumenPagoPortal): ResumenPagoPortal {
  return {
    ...resumen,
    metodos_pago: resumen.metodos_pago.filter((m) => esMetodoPortalPermitido(m.codigo)),
  };
}

function normalizarReservaPortalMis(raw: unknown): ReservaPortalMis {
  const r = raw as Record<string, unknown>;
  const viaje = r.viaje as Record<string, unknown> | undefined;
  const asientosRaw = r.asientos;
  const asientos = Array.isArray(asientosRaw)
    ? asientosRaw
        .map((valor) => (valor == null ? '' : String(valor).trim()))
        .filter((valor) => valor.length > 0)
    : undefined;

  return {
    id: r.id as number,
    viaje_id: (r.viaje_id ?? viaje?.id) as number | undefined,
    destino_nombre: (r.destino_nombre ?? viaje?.destino_nombre ?? null) as string | null,
    destino_imagen: resolverUrlArchivo(
      (r.destino_imagen as string | null | undefined) ?? null,
    ) || null,
    ubicacion: (r.ubicacion as string | null | undefined) ?? null,
    fecha_salida: (r.fecha_salida ?? viaje?.fecha_salida ?? null) as string | null,
    hora_salida: (r.hora_salida as string | null | undefined) ?? null,
    asientos,
    estado: (r.estado as string | null | undefined) ?? null,
    resumen_pagos: (r.resumen_pagos as ReservaPortalMis['resumen_pagos']) ?? null,
  };
}

export async function listarMisReservasPortal(
  query?: PaginacionQuery,
): Promise<RespuestaPaginada<ReservaPortalMis>> {
  const limite =
    query?.limite != null
      ? Math.min(query.limite, LIMITE_PAGINA_PORTAL_RESERVAS)
      : undefined;
  const params = agregarPaginacionAParams(new URLSearchParams(), { ...query, limite });
  const data = await apiRequest<unknown>(
    `/reservas/portal/mis-reservas?${params.toString()}`,
    { requiresAuth: true },
  );
  const normalizada = normalizarRespuestaPaginada<unknown>(data, query?.limite);
  return {
    ...normalizada,
    items: normalizada.items.map(normalizarReservaPortalMis),
  };
}

export async function obtenerMiReservaPortal(reservaId: number): Promise<ReservaPortalMis> {
  const data = await apiRequest<{ reserva: unknown }>(
    `/reservas/portal/mis-reservas/${reservaId}`,
    { requiresAuth: true },
  );
  return normalizarReservaPortalMis(data.reserva);
}

export async function listarMisPagosPortal(
  query?: PaginacionQuery,
): Promise<RespuestaPaginada<PagoPortalMis>> {
  const params = agregarPaginacionAParams(new URLSearchParams(), query);
  const data = await apiRequest<unknown>(
    `/pagos/portal/mis-pagos?${params.toString()}`,
    { requiresAuth: true },
  );
  return normalizarRespuestaPaginada<PagoPortalMis>(data, query?.limite);
}

export async function obtenerDetallePagoPortal(
  reservaId: number,
  pagoId: number,
): Promise<PagoPortalDetalle> {
  return apiRequest<PagoPortalDetalle>(
    `/reservas/${reservaId}/pagos/portal/${pagoId}`,
    { requiresAuth: true },
  );
}

export async function getResumenPago(reservaId: number): Promise<ResumenPagoPortal> {
  const data = await apiRequest<ResumenPagoPortal>(
    `/reservas/${reservaId}/pagos/portal/resumen`,
    { requiresAuth: true },
  );
  return filtrarMetodosPortal(data);
}

export async function cotizarPago(
  reservaId: number,
  params: CotizarPagoPortalParams,
): Promise<CotizarPagoPortalRespuesta> {
  const query = new URLSearchParams({
    monto_eur: String(params.monto_eur),
    metodo_pago_id: String(params.metodo_pago_id),
    tasa_id: String(params.tasa_id),
  });
  return apiRequest<CotizarPagoPortalRespuesta>(
    `/reservas/${reservaId}/pagos/portal/cotizar?${query.toString()}`,
    { requiresAuth: true },
  );
}

export async function reportarPago(
  reservaId: number,
  body: ReportarPagoPortalDTO,
): Promise<ReportarPagoPortalRespuesta> {
  return apiMutacion(() =>
    apiRequest<ReportarPagoPortalRespuesta>(
      `/reservas/${reservaId}/pagos/portal/reportar`,
      {
        method: 'POST',
        requiresAuth: true,
        body: JSON.stringify(body),
      },
    ),
  );
}

/** Monto en Bs del saldo pendiente según el resumen del portal. */
export function montoBsSaldoPendiente(resumen: ResumenPagoPortal): number | null {
  return montoBsDesdeEur(resumen, resumen.resumen.saldo_pendiente_eur);
}

/** Monto sugerido para el primer abono (depósito mínimo o saldo restante). */
export function montoBsSugerido(resumen: ResumenPagoPortal): number | null {
  const sugeridoEur =
    resumen.resumen.monto_sugerido_eur ??
    Math.min(DEPOSITO_MINIMO_EUR, resumen.resumen.saldo_pendiente_eur);
  return montoBsDesdeEur(resumen, sugeridoEur);
}

function montoBsDesdeEur(resumen: ResumenPagoPortal, montoEur: number): number | null {
  const cotizacion = resumen.cotizacion_saldo_pendiente?.find(
    (c) =>
      (c.moneda_codigo === 'VES' || c.moneda === 'VES') &&
      c.monto_eur != null &&
      Math.abs(c.monto_eur - montoEur) < 0.01,
  );
  if (cotizacion?.monto != null) return cotizacion.monto;

  const tasa = resumen.tasa_eur?.valor;
  if (tasa != null) return redondearBs(montoEur * tasa);
  return null;
}

/** Monto total de la reserva en Bs (referencia EUR × tasa del día). */
export function montoBsTotalReserva(resumen: ResumenPagoPortal): number | null {
  const cotizacionTotal = resumen.cotizacion_saldo_pendiente?.find(
    (c) =>
      (c.moneda_codigo === 'VES' || c.moneda === 'VES') &&
      c.monto_eur != null &&
      Math.abs(c.monto_eur - resumen.resumen.total_reserva_eur) < 0.01,
  );
  if (cotizacionTotal?.monto != null) return cotizacionTotal.monto;

  const tasa = resumen.tasa_eur?.valor;
  if (tasa != null) {
    return redondearBs(resumen.resumen.total_reserva_eur * tasa);
  }
  return null;
}

function redondearBs(monto: number): number {
  return Math.round(monto * 100) / 100;
}

export function obtenerBancoDestinoId(resumen: ResumenPagoPortal): number | null {
  if (resumen.cuenta_receptora?.banco_destino_id) {
    return resumen.cuenta_receptora.banco_destino_id;
  }
  if (resumen.banco_destino_id) {
    return resumen.banco_destino_id;
  }
  return null;
}

export function metodoPagoIdPorCodigo(
  resumen: ResumenPagoPortal,
  codigo: MetodoPagoPortalCodigo,
): number | undefined {
  return resumen.metodos_pago.find((m) => m.codigo === codigo)?.id;
}

export function formatearMontoPortalPago(pago: Pick<PagoPortalMis, 'monto' | 'metodo_pago'>): string {
  const simbolo = pago.metodo_pago.moneda?.simbolo ?? 'Bs.';
  const codigo = pago.metodo_pago.moneda?.codigo ?? 'VES';
  const valor = pago.monto.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (codigo === 'VES') return `Bs. ${valor}`;
  return `${simbolo} ${valor}`;
}

export function reservaIdDePago(pago: Pick<PagoPortalMis, 'reserva_id' | 'reserva'>): number {
  return pago.reserva_id ?? pago.reserva?.id ?? 0;
}

export function ultimoPagoReserva(pagos: PagoPortalMis[], reservaId: number): PagoPortalMis | undefined {
  return pagos
    .filter((p) => reservaIdDePago(p) === reservaId)
    .sort((a, b) => b.id - a.id)[0];
}

const TOLERANCIA_EUR = 0.01;

export interface DatosFormularioPagoPortal {
  metodo: string;
  banco: string;
  referencia: string;
  monto: string;
  fecha: string;
  comprobanteArchivo: File | null;
}

export interface ConstruirReportePagoPortalParams {
  resumenPortal: ResumenPagoPortal;
  datos: DatosFormularioPagoPortal;
  tasaId: number;
  metodoPagoIdPorCodigo: (codigo: MetodoPagoPortalCodigo) => number | undefined;
  cotizarMontoEur: (montoEur: number, codigoMetodo: MetodoPagoPortalCodigo) => Promise<CotizarPagoPortalRespuesta>;
  obtenerBancoDestinoId: () => number | null;
  comprobanteUrl?: string | null;
  telefonoCliente?: string | null;
}

export async function construirReportePagoPortal(
  params: ConstruirReportePagoPortalParams,
): Promise<ReportarPagoPortalDTO> {
  const {
    resumenPortal,
    datos,
    tasaId,
    metodoPagoIdPorCodigo,
    cotizarMontoEur,
    obtenerBancoDestinoId,
    comprobanteUrl = null,
    telefonoCliente = null,
  } = params;

  const codigoMetodo = datos.metodo as MetodoPagoPortalCodigo;
  const metodoPagoId = metodoPagoIdPorCodigo(codigoMetodo);
  if (!metodoPagoId) {
    throw new Error('Método de pago no disponible.');
  }

  const montoBs = Number(datos.monto);
  if (!Number.isFinite(montoBs) || montoBs <= 0) {
    throw new Error('Ingrese un monto válido en bolívares.');
  }

  const saldoBs = montoBsSaldoPendiente(resumenPortal);
  if (saldoBs == null) {
    throw new Error('No se pudo obtener el monto en bolívares del resumen.');
  }

  if (montoBs > saldoBs + 0.01) {
    throw new Error(`El monto no puede superar el saldo pendiente (${saldoBs.toFixed(2)} Bs).`);
  }

  const tasa = resumenPortal.tasa_eur?.valor;
  if (!tasa) {
    throw new Error('No hay tasa de cambio disponible.');
  }

  const montoEurAprox = montoBs / tasa;
  const saldoEur = resumenPortal.resumen.saldo_pendiente_eur;
  const pendienteValidacionEur = resumenPortal.resumen.total_pendiente_validacion_eur ?? 0;
  const saldoDisponibleEur = Math.max(saldoEur - pendienteValidacionEur, 0);
  const esPagoTotal = montoEurAprox >= saldoDisponibleEur - TOLERANCIA_EUR;
  const depositoMinimoEur =
    resumenPortal.resumen.deposito_minimo_eur ??
    resumenPortal.deposito_minimo_eur ??
    DEPOSITO_MINIMO_EUR;
  const minimoRequeridoEur = Math.min(depositoMinimoEur, saldoDisponibleEur);

  if (!esPagoTotal && montoEurAprox + TOLERANCIA_EUR < minimoRequeridoEur) {
    throw new Error(
      `El depósito mínimo es ${depositoMinimoEur.toFixed(2)} EUR. Puede abonar el resto después.`,
    );
  }

  const tipo: 'cuota' | 'total' = esPagoTotal ? 'total' : 'cuota';
  let montoEnviar = montoBs;

  if (esPagoTotal) {
    const cotizacionTotal = await cotizarMontoEur(saldoDisponibleEur, codigoMetodo);
    montoEnviar = cotizacionTotal.monto;
  } else {
    const cotizacion = await cotizarMontoEur(montoEurAprox, codigoMetodo);
    montoEnviar = cotizacion.monto;
  }

  const bancoOrigen = resumenPortal.bancos.find((b) => b.nombre === datos.banco);
  const bancoDestinoId = obtenerBancoDestinoId() ?? bancoOrigen?.id ?? null;

  return {
    metodo_pago_id: metodoPagoId,
    tasa_id: tasaId,
    monto: montoEnviar,
    tipo,
    fecha_pago: datos.fecha,
    referencia: datos.referencia.trim(),
    banco_origen_id: bancoOrigen?.id ?? null,
    banco_destino_id: bancoDestinoId,
    telefono_origen: codigoMetodo === 'pago_movil' ? telefonoCliente : null,
    comprobante_url: comprobanteUrl,
    notas: null,
  };
}
