import type { EstadoPago, FormularioPagoDraft, MetodoPago, ResumenPagosReserva, TipoPago } from '../../../../types/pagos';
import {
  esCobroEnBolivares,
  esEfectivoBs,
  esEfectivoUsd,
  requiereBancos,
  requiereCorreo,
  requierePuntoVenta,
  requiereTelefono,
} from './utils/metodosPagoUi';

export const MODULO_PAGOS = 'reportes_pago';

export const ETIQUETA_ESTADO_PAGO: Record<EstadoPago, string> = {
  en_validacion: 'En validación',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
};

export const ETIQUETA_TIPO_PAGO: Record<TipoPago, string> = {
  cuota: 'Cuota',
  total: 'Total',
};

export const DEPOSITO_MINIMO_EUR = 5;

export function fechaHoyIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formularioPagoVacio(fechaHoy: string): FormularioPagoDraft {
  return {
    metodo_pago_id: '',
    tasa_id: '',
    monto: '',
    tipo: 'cuota',
    fecha_pago: fechaHoy,
    referencia: '',
    banco_origen_id: '',
    banco_destino_id: '',
    punto_venta_id: '',
    telefono_origen: '',
    correo_origen: '',
    comprobante_url: '',
    notas: '',
  };
}

export function sanitizarTelefono(valor: string): string {
  return valor.replace(/\D/g, '').slice(0, 11);
}

export function sanitizarMonto(valor: string): string {
  const limpio = valor.replace(/[^\d.,]/g, '').replace(',', '.');
  const partes = limpio.split('.');
  if (partes.length <= 1) return partes[0] ?? '';
  return `${partes[0]}.${partes.slice(1).join('').slice(0, 2)}`;
}

export function validarFormularioPago(
  form: FormularioPagoDraft,
  metodo?: MetodoPago,
  tasaIdFallback?: number,
  resumen?: ResumenPagosReserva,
  tasaValor?: number,
): string | null {
  const monto = Number(form.monto);
  const codigo = metodo?.codigo ?? '';
  const tasaId = form.tasa_id || (tasaIdFallback ? String(tasaIdFallback) : '');

  if (!form.metodo_pago_id) return 'Selecciona un método de pago.';
  if (esCobroEnBolivares(metodo) && !tasaId) {
    return 'No hay tasa de cambio disponible para pagos en bolívares.';
  }
  if (!tasaId) return 'Falta la tasa de cambio en el sistema.';
  if (!form.monto || Number.isNaN(monto) || monto <= 0) return 'Ingresa un monto mayor a cero.';

  if (resumen && !resumen.pagado_completo) {
    const saldoDisponibleEur = Math.max(
      resumen.saldo_pendiente_eur - resumen.total_pendiente_validacion_eur,
      0,
    );
    const depositoMinimo = resumen.deposito_minimo_eur ?? DEPOSITO_MINIMO_EUR;
    const minimoRequerido = Math.min(depositoMinimo, saldoDisponibleEur);
    let montoEurAprox = monto;

    if (esCobroEnBolivares(metodo)) {
      if (!tasaValor || tasaValor <= 0) {
        return 'No hay tasa de cambio disponible para validar el monto.';
      }
      montoEurAprox = monto / tasaValor;
    }

    const esPagoTotal = montoEurAprox >= saldoDisponibleEur - 0.01;
    if (!esPagoTotal && montoEurAprox + 0.01 < minimoRequerido) {
      return `El depósito mínimo es ${depositoMinimo.toFixed(2)} EUR por abono, salvo liquidar el saldo completo.`;
    }
  }

  const soloMonto = esEfectivoBs(metodo) || esEfectivoUsd(metodo);
  if (!soloMonto && !form.fecha_pago) return 'Indica la fecha de pago.';

  if (requiereBancos(codigo)) {
    if (!form.banco_origen_id) return 'Selecciona el banco de origen.';
    if (!form.banco_destino_id) return 'Selecciona el banco de destino.';
    if (!form.referencia.trim()) return 'Ingresa la referencia del pago.';
    if (codigo === 'pago_movil' && form.referencia.replace(/\D/g, '').length < 6) {
      return 'La referencia debe tener al menos 6 dígitos.';
    }
  }

  if (requiereTelefono(codigo)) {
    const tel = form.telefono_origen.trim();
    if (!tel) return 'Ingresa el teléfono de origen.';
    if (!/^\d{10,11}$/.test(tel)) return 'El teléfono debe tener 10 u 11 dígitos (solo números).';
  }

  if (requiereCorreo(codigo)) {
    if (!form.correo_origen.trim()) return 'Ingresa el correo de origen (Zelle).';
    if (!form.referencia.trim()) return 'Ingresa la referencia del pago.';
    if (!form.fecha_pago) return 'Indica la fecha de pago.';
  }

  if (requierePuntoVenta(codigo)) {
    if (!form.punto_venta_id) return 'Selecciona el punto de venta (TPV).';
    if (!form.referencia.trim()) return 'Ingresa la referencia del pago.';
  }

  return null;
}

export function esFormularioPagoCompleto(
  form: FormularioPagoDraft,
  metodo?: MetodoPago,
  tasaIdFallback?: number,
  resumen?: ResumenPagosReserva,
  tasaValor?: number,
): boolean {
  return validarFormularioPago(form, metodo, tasaIdFallback, resumen, tasaValor) === null;
}

export function formularioTrasRegistroPago(
  formActual: FormularioPagoDraft,
  fechaHoy: string,
  tasaId?: number
): FormularioPagoDraft {
  return {
    ...formularioPagoVacio(fechaHoy),
    metodo_pago_id: formActual.metodo_pago_id,
    tasa_id: formActual.tasa_id || (tasaId ? String(tasaId) : ''),
    tipo: 'cuota',
  };
}
