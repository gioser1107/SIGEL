import { claveEstado, etiquetaEstado } from '../../../utils/etiquetasNegocio';
import './EtiquetaEstado.css';

export type VarianteBadge = 'exito' | 'advertencia' | 'error' | 'info' | 'neutro';

interface EtiquetaEstadoProps {
  etiqueta: string;
  variante?: VarianteBadge;
}

const MAPA_ESTADOS: Record<string, VarianteBadge> = {
  planificado: 'info',
  en_curso: 'advertencia',
  finalizado: 'neutro',
  cancelado: 'error',
  solicitada: 'neutro',
  aceptada: 'exito',
  vencida: 'info',
  cancelada: 'error',
  pendiente: 'advertencia',
  confirmada: 'exito',
  abonada: 'info',
  anulado: 'error',
  anulada: 'error',
  abordado: 'exito',
  no_presentado: 'error',
  aprobado: 'exito',
  rechazado: 'error',
  en_validacion: 'advertencia',
  activo: 'exito',
  inactivo: 'neutro',
};

export function resolverVariante(estado: string): VarianteBadge {
  return MAPA_ESTADOS[claveEstado(estado)] ?? 'neutro';
}

export default function EtiquetaEstado({ etiqueta, variante }: EtiquetaEstadoProps) {
  const v = variante ?? resolverVariante(etiqueta);
  return (
    <span className={`etiqueta-estado etiqueta-estado--${v}`}>
      <span className="etiqueta-estado__punto" aria-hidden="true" />
      {etiquetaEstado(etiqueta)}
    </span>
  );
}
