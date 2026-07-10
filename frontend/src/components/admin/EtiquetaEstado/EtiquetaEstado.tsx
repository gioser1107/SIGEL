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
  abordado: 'exito',
  no_presentado: 'error',
  aprobado: 'exito',
  rechazado: 'error',
};

export function resolverVariante(estado: string): VarianteBadge {
  return MAPA_ESTADOS[estado.toLowerCase()] ?? 'neutro';
}

export default function EtiquetaEstado({ etiqueta, variante }: EtiquetaEstadoProps) {
  const v = variante ?? resolverVariante(etiqueta);
  return (
    <span className={`etiqueta-estado etiqueta-estado--${v}`}>
      <span className="etiqueta-estado__punto" aria-hidden="true" />
      {etiqueta}
    </span>
  );
}
