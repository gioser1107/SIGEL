import { ErrorApi } from '../../../../services/api';

export function mensajeError(err: unknown, contexto = 'pagos'): string {
  if (err instanceof ErrorApi && err.status === 403) {
    return `No tienes permiso para gestionar ${contexto}.`;
  }
  if (err instanceof ErrorApi) return err.message;
  if (err instanceof Error) return err.message;
  return 'Ocurrió un error inesperado.';
}
