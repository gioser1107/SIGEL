import apiRequest, { apiSubirArchivo } from './api';
import { apiMutacion } from '../utils/notificacionesEventos';

export interface CreditoCliente {
  id: number;
  cliente_id: number;
  reserva_origen_id: number | null;
  monto_eur: number;
  saldo_restante_eur: number;
  motivo: string;
  notas: string | null;
  creado_en: string | null;
}

export interface ResumenCreditos {
  cliente_id: number;
  saldo_disponible_eur: number;
  creditos: CreditoCliente[];
  politica: string;
}

export async function obtenerMisCreditos(): Promise<ResumenCreditos> {
  return apiRequest<ResumenCreditos>('/creditos/portal/mios', { requiresAuth: true });
}

export async function obtenerCreditosAdmin(clienteId?: number): Promise<{ items: CreditoCliente[] }> {
  const consulta = clienteId != null ? `?cliente_id=${clienteId}` : '';
  return apiRequest<{ items: CreditoCliente[] }>(`/creditos${consulta}`, { requiresAuth: true });
}

export function saldoCreditos(items: CreditoCliente[]): number {
  return items.reduce((suma, credito) => suma + (credito.saldo_restante_eur ?? 0), 0);
}

export async function aplicarCreditoPortal(
  reservaId: number,
  montoEur?: number,
): Promise<{ mensaje: string; aplicado_eur: number; saldo_disponible_eur: number }> {
  return apiMutacion(() =>
    apiRequest('/creditos/portal/aplicar', {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify({ reserva_id: reservaId, monto_eur: montoEur }),
    }),
  );
}

export async function aplicarCreditoAdmin(
  reservaId: number,
  montoEur?: number,
): Promise<{ mensaje: string; aplicado_eur: number; saldo_disponible_eur: number }> {
  return apiMutacion(() =>
    apiRequest('/creditos/aplicar', {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify({ reserva_id: reservaId, monto_eur: montoEur }),
    }),
  );
}

export async function cancelarReservaSinReembolso(
  reservaId: number,
  notas?: string,
): Promise<{ mensaje: string; credito: CreditoCliente | null }> {
  return apiMutacion(() =>
    apiRequest(`/creditos/reservas/${reservaId}/cancelar`, {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify({ notas }),
    }),
  );
}

export async function subirPartidaNacimiento(archivo: File): Promise<string> {
  const respuesta = await apiSubirArchivo<{ partida_nacimiento_url: string }>(
    '/reservas/portal/partida/upload',
    'archivo',
    archivo,
    undefined,
    { requiresAuth: true },
  );
  return respuesta.partida_nacimiento_url;
}
