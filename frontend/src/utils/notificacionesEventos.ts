/** Evento global para refrescar el badge de notificaciones del admin. */
export const EVENTO_INVALIDAR_NOTIFICACIONES = 'travelbqto:invalidar-notificaciones';

/** Dispara una recarga de notificaciones en LayoutAdmin (sin recargar la página). */
export function invalidarNotificaciones(): void {
  window.dispatchEvent(new CustomEvent(EVENTO_INVALIDAR_NOTIFICACIONES));
}

/** Ejecuta una mutación API y refresca el badge de notificaciones al completarse. */
export async function apiMutacion<T>(llamada: () => Promise<T>): Promise<T> {
  const resultado = await llamada();
  invalidarNotificaciones();
  return resultado;
}
