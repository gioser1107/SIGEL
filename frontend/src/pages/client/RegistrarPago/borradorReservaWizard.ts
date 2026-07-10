import type { EstadoFormularioPasajeros } from '../../../components/client/FormularioPasajeros/FormularioPasajeros';

const PREFIJO_CLAVE = 'reserva_wizard_';

export interface BorradorReservaWizard {
  viajeId: number;
  paso: number;
  datosPasajeros: EstadoFormularioPasajeros | null;
  asientos: number[];
  reservaId: number | null;
  asientosGuardados: boolean;
}

function claveBorrador(usuarioId: number, viajeId: number): string {
  return `${PREFIJO_CLAVE}${usuarioId}_${viajeId}`;
}

export function cargarBorradorReservaWizard(
  usuarioId: number | undefined,
  viajeId: number,
): BorradorReservaWizard | null {
  if (!usuarioId) return null;
  try {
    const raw = sessionStorage.getItem(claveBorrador(usuarioId, viajeId));
    if (!raw) return null;
    const datos = JSON.parse(raw) as BorradorReservaWizard;
    if (datos.viajeId !== viajeId) return null;
    return datos;
  } catch {
    return null;
  }
}

export function guardarBorradorReservaWizard(
  usuarioId: number | undefined,
  borrador: BorradorReservaWizard,
): void {
  if (!usuarioId) return;
  try {
    sessionStorage.setItem(claveBorrador(usuarioId, borrador.viajeId), JSON.stringify(borrador));
  } catch {
    // sessionStorage lleno o no disponible; el flujo sigue en memoria
  }
}

export function limpiarBorradorReservaWizard(usuarioId: number | undefined, viajeId: number): void {
  if (!usuarioId) return;
  sessionStorage.removeItem(claveBorrador(usuarioId, viajeId));
}
