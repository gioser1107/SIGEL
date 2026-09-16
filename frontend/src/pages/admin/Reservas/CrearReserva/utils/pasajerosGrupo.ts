import { FORM_VACIO } from '../../../Clientes/constants';
import type { PasajeroDraft } from '../../../../../types/reservas';
import type { FormularioCliente } from '../../../../../utils/validacionesCliente';

function clonarFichaVacia(): FormularioCliente {
  return { ...FORM_VACIO };
}

export function crearPasajeroVacio(precioBase: number, idTemporal: number): PasajeroDraft {
  return {
    id_temporal: idTemporal,
    modo: 'nuevo',
    cliente_id: 0,
    nombre: '',
    apellido: '',
    numero_documento: '',
    tipo_documento: 'V',
    ficha: clonarFichaVacia(),
    es_menor: false,
    ocupa_asiento: true,
    precio_pasajero_eur: precioBase,
    recargo_eur: 0,
    notas_tarifa: '',
    punto_recogida_id: undefined,
    puntos_recogida: undefined,
  };
}

/** Titular + N-1 acompañantes. Conserva los ya capturados al cambiar la cantidad. */
export function sincronizarAcompanantes(
  cantidadPersonas: number,
  precioBase: number,
  actuales: PasajeroDraft[],
): PasajeroDraft[] {
  const meta = Math.max(0, cantidadPersonas - 1);
  if (actuales.length === meta) return actuales;
  if (actuales.length > meta) return actuales.slice(0, meta);

  const extra = Array.from({ length: meta - actuales.length }, (_, i) =>
    crearPasajeroVacio(precioBase, Date.now() + i + actuales.length * 17),
  );
  return [...actuales, ...extra];
}
