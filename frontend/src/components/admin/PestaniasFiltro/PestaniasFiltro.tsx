import './PestaniasFiltro.css';

export interface PestaniaFiltro {
  id: string;
  etiqueta: string;
  contador?: number;
}

interface PestaniasFiltroProps {
  pestanias: PestaniaFiltro[];
  activa: string;
  onChange: (id: string) => void;
}

export default function PestaniasFiltro({ pestanias, activa, onChange }: PestaniasFiltroProps) {
  return (
    <div className="pestanias-filtro" role="tablist" aria-label="Filtros de vista">
      {pestanias.map((p) => (
        <button
          key={p.id}
          role="tab"
          aria-selected={activa === p.id}
          className={`pestanias-filtro__pestania ${activa === p.id ? 'pestanias-filtro__pestania--activa' : ''}`}
          onClick={() => onChange(p.id)}
        >
          {p.etiqueta}
          {p.contador !== undefined && (
            <span className="pestanias-filtro__contador">{p.contador}</span>
          )}
        </button>
      ))}
    </div>
  );
}
