const PARAM_CONTINUAR = 'continuar';
const VALOR_RESERVA = 'reserva';

export const URL_LOGIN_PARA_RESERVA = `/iniciar-sesion?${PARAM_CONTINUAR}=${VALOR_RESERVA}`;

export function quiereContinuarReserva(search: string): boolean {
  return new URLSearchParams(search).get(PARAM_CONTINUAR) === VALOR_RESERVA;
}

export function destinoClienteTrasAuth(viajePendiente: unknown, search: string): string {
  if (quiereContinuarReserva(search) && viajePendiente) {
    return '/client/registrar-pago';
  }
  return '/client/dashboard';
}

export function enlaceAuthPreservandoReserva(ruta: string, search: string): string {
  return quiereContinuarReserva(search) ? `${ruta}?${PARAM_CONTINUAR}=${VALOR_RESERVA}` : ruta;
}
