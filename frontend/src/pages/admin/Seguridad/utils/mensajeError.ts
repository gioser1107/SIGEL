import { ErrorApi } from '../../../../services/api';

export function mensajeError(err: unknown): string {
  if (err instanceof ErrorApi) return err.message;
  if (err instanceof Error) return err.message;
  return 'No se pudo completar. Intenta de nuevo.';
}
