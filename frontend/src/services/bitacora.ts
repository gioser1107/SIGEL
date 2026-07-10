/**
 * bitacora.ts — Consulta de auditoría del sistema (solo lectura).
 */

import apiRequest from './api';
import type { DetalleBitacora, FiltrosBitacora, RespuestaBitacora } from '../types/bitacora';

export async function obtenerBitacora(filtros?: FiltrosBitacora): Promise<RespuestaBitacora> {
  const consulta = new URLSearchParams();
  if (filtros?.modulo) consulta.set('modulo', filtros.modulo);
  if (filtros?.accion) consulta.set('accion', filtros.accion);
  if (filtros?.usuario_id) consulta.set('usuario_id', String(filtros.usuario_id));
  if (filtros?.fecha_desde) consulta.set('fecha_desde', filtros.fecha_desde);
  if (filtros?.fecha_hasta) consulta.set('fecha_hasta', filtros.fecha_hasta);
  if (filtros?.q) consulta.set('q', filtros.q);
  if (filtros?.limite) consulta.set('limite', String(filtros.limite));
  if (filtros?.pagina) consulta.set('pagina', String(filtros.pagina));

  const sufijo = consulta.toString() ? `?${consulta.toString()}` : '';
  return apiRequest<RespuestaBitacora>(`/bitacora${sufijo}`, { requiresAuth: true });
}

export async function obtenerDetalleBitacora(id: number): Promise<DetalleBitacora> {
  return apiRequest<DetalleBitacora>(`/bitacora/${id}`, { requiresAuth: true });
}
