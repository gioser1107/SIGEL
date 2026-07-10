import type { EstadoPago, MetodoPago } from '../../../../../types/pagos';

export function etiquetaMetodoCorta(metodo: MetodoPago): string {
  const mapa: Record<string, string> = {
    efectivo: metodo.moneda.codigo === 'USD' ? 'Efectivo $' : 'Efectivo Bs',
    efectivo_bs: 'Efectivo Bs',
    efectivo_usd: 'Efectivo $',
    pago_movil: 'Pago Móvil Bs',
    transferencia: 'Transferencia',
    tpv: 'Punto Bs',
    punto: 'Punto Bs',
    zelle: 'Zelle',
    otro: 'Efectivo $',
  };
  return mapa[metodo.codigo] ?? metodo.nombre;
}

export function tituloSeccionMetodo(codigo: string): string {
  const mapa: Record<string, string> = {
    efectivo: 'Efectivo',
    efectivo_bs: 'Efectivo en bolívares',
    efectivo_usd: 'Efectivo en dólares',
    pago_movil: 'Pago móvil',
    transferencia: 'Transferencia bancaria',
    tpv: 'Pago por punto de venta',
    punto: 'Pago por punto de venta',
    zelle: 'Zelle',
    otro: 'Efectivo $',
  };
  return mapa[codigo] ?? 'Información del pago';
}

export function tituloDatosMetodo(codigo: string): string {
  const mapa: Record<string, string> = {
    pago_movil: 'Datos del pago móvil',
    transferencia: 'Datos de la transferencia',
    tpv: 'Datos del punto de venta',
    punto: 'Datos del punto de venta',
    zelle: 'Datos de Zelle',
  };
  return mapa[codigo] ?? '';
}

export function requiereBancos(codigo: string): boolean {
  return codigo === 'transferencia' || codigo === 'pago_movil';
}

export function requiereTelefono(codigo: string): boolean {
  return codigo === 'pago_movil';
}

export function requiereCorreo(codigo: string): boolean {
  return codigo === 'zelle';
}

export function requierePuntoVenta(codigo: string): boolean {
  return codigo === 'tpv' || codigo === 'punto';
}

export function requiereComprobante(codigo: string): boolean {
  return codigo === 'pago_movil' || codigo === 'zelle';
}

/** Solo pago móvil y Zelle quedan en validación al registrar desde admin. */
export function requiereValidacionPagoAdmin(codigo: string): boolean {
  return codigo === 'pago_movil' || codigo === 'zelle';
}

export function estadoInicialPagoAdmin(codigo: string): EstadoPago {
  return requiereValidacionPagoAdmin(codigo) ? 'en_validacion' : 'aprobado';
}

/** Efectivo en bolívares: solo monto (sin referencia ni comprobante). */
export function esEfectivoBs(metodo: MetodoPago | undefined): boolean {
  if (!metodo) return false;
  if (metodo.codigo === 'efectivo_bs') return true;
  return metodo.codigo === 'efectivo' && metodo.moneda.codigo === 'VES';
}

/** Efectivo en dólares (código otro / efectivo_usd). Siempre 1 USD = 1 EUR. */
export function esEfectivoUsd(metodo: MetodoPago | undefined): boolean {
  if (!metodo) return false;
  if (metodo.codigo === 'otro' || metodo.codigo === 'efectivo_usd') return true;
  return metodo.codigo === 'efectivo' && metodo.moneda.codigo === 'USD';
}

/** Zelle y efectivo $: el monto en USD descuenta el saldo en EUR a la par. */
export function esPagoUsdEquivalenteEur(metodo: MetodoPago | undefined): boolean {
  if (!metodo) return false;
  return metodo.codigo === 'zelle' || esEfectivoUsd(metodo);
}

/** Métodos cuyo monto se ingresa en bolívares y requiere tasa Bs/€. */
export function esCobroEnBolivares(metodo: MetodoPago | undefined): boolean {
  if (!metodo || esPagoUsdEquivalenteEur(metodo)) return false;
  const codigo = metodo.codigo;
  if (codigo === 'pago_movil' || codigo === 'tpv' || codigo === 'punto' || codigo === 'efectivo_bs') {
    return true;
  }
  if (codigo === 'efectivo' && metodo.moneda.codigo === 'VES') return true;
  return metodo.moneda.codigo === 'VES';
}

export function etiquetaMonedaMetodo(metodo: MetodoPago | undefined): string {
  if (!metodo) return '';
  if (esPagoUsdEquivalenteEur(metodo)) return 'USD';
  return metodo.moneda.codigo;
}

export function requiereTasaParaMetodo(metodo: MetodoPago | undefined): boolean {
  return esCobroEnBolivares(metodo);
}
