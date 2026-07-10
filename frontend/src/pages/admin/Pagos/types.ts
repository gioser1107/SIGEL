export type SeccionPagos =
  | 'bandeja'
  | 'monedas'
  | 'metodos'
  | 'tasas'
  | 'bancos'
  | 'puntos_venta';

export interface PropsSeccionPagos {
  activo: boolean;
  puedeCrear: boolean;
  puedeEditar: boolean;
  puedeBorrar: boolean;
  onExito: (mensaje: string) => void;
  onError: (mensaje: string) => void;
}
