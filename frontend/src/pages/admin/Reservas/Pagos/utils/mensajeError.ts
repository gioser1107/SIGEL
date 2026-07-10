import { ErrorApi } from '../../../../../services/api';

export function mensajeErrorPago(err: unknown): string {
  if (err instanceof ErrorApi && err.status === 403) {
    return 'No tienes permiso para gestionar pagos.';
  }
  if (err instanceof ErrorApi) return err.message;
  if (err instanceof Error) return err.message;
  return 'Ocurrió un error inesperado.';
}
