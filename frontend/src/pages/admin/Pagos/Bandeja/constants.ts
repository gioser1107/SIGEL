export interface FiltrosBandeja {
  estado: string;
  reserva_id: string;
  metodo_pago_id: string;
  fecha_desde: string;
  fecha_hasta: string;
}

export const FILTROS_BANDEJA_VACIOS: FiltrosBandeja = {
  estado: 'en_validacion',
  reserva_id: '',
  metodo_pago_id: '',
  fecha_desde: '',
  fecha_hasta: '',
};
