import type { SeccionPagos } from './types';

export { fechaHoyIso } from '../../../utils/validacionesFormulario';

export const MODULO = 'reportes_pago';

export interface MetaSeccionPagos {
  id: SeccionPagos;
  etiqueta: string;
  titulo: string;
  descripcion: string;
}

export const GRUPOS_PAGOS: { etiqueta: string; secciones: MetaSeccionPagos[] }[] = [
  {
    etiqueta: 'Operación',
    secciones: [
      {
        id: 'bandeja',
        etiqueta: 'Bandeja de pagos',
        titulo: 'Bandeja de pagos',
        descripcion: 'Pagos reportados por clientes o el personal. Revisa el comprobante: si cuadra, aprueba para que sume a la reserva; si no, recházalo.',
      },
      {
        id: 'tasas',
        etiqueta: 'Tasas de cambio',
        titulo: 'Tasas de cambio',
        descripcion: 'Tasa BCV automática o registro manual para cobrar en bolívares.',
      },
    ],
  },
  {
    etiqueta: 'Catálogos',
    secciones: [
      {
        id: 'monedas',
        etiqueta: 'Monedas',
        titulo: 'Monedas',
        descripcion: 'Divisas aceptadas para registrar pagos.',
      },
      {
        id: 'metodos',
        etiqueta: 'Métodos de pago',
        titulo: 'Métodos de pago',
        descripcion: 'Formas de pago disponibles (efectivo, transferencia, Zelle, etc.).',
      },
      {
        id: 'bancos',
        etiqueta: 'Bancos',
        titulo: 'Bancos',
        descripcion: 'Entidades bancarias usadas en transferencias.',
      },
      {
        id: 'puntos_venta',
        etiqueta: 'Puntos de venta',
        titulo: 'Puntos de venta',
        descripcion: 'Ubicaciones donde se reciben pagos presenciales.',
      },
    ],
  },
];

export function metaSeccionPagos(id: SeccionPagos): MetaSeccionPagos {
  for (const grupo of GRUPOS_PAGOS) {
    const seccion = grupo.secciones.find((s) => s.id === id);
    if (seccion) return seccion;
  }
  return GRUPOS_PAGOS[0].secciones[0];
}

export const ETIQUETA_ESTADO_PAGO: Record<string, string> = {
  en_validacion: 'En validación',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
};

export const CODIGOS_METODO_SUGERIDOS = [
  'efectivo',
  'transferencia',
  'pago_movil',
  'zelle',
  'tpv',
  'otro',
];
