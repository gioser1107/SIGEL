import Boton from '../Boton/Boton';
import './BtnImprimirReporte.css';

interface BtnImprimirReporteProps {
  etiqueta?: string;
  claseZona?: string;
  deshabilitado?: boolean;
  alImprimir?: () => void | Promise<void>;
}

function IconoImpresora() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  );
}

export default function BtnImprimirReporte({
  etiqueta = 'Imprimir reporte',
  claseZona = 'zona-imprimible',
  deshabilitado = false,
  alImprimir,
}: BtnImprimirReporteProps) {
  async function manejarImpresion() {
    if (alImprimir) {
      await alImprimir();
      return;
    }
    document.body.setAttribute('data-zona-imprimir', claseZona);
    window.print();
    window.setTimeout(() => {
      document.body.removeAttribute('data-zona-imprimir');
    }, 0);
  }

  return (
    <Boton
      type="button"
      variante="secundario"
      tamano="sm"
      className="btn-imprimir-reporte no-imprimir"
      onClick={manejarImpresion}
      disabled={deshabilitado}
      aria-label={etiqueta}
    >
      <IconoImpresora />
      {etiqueta}
    </Boton>
  );
}
