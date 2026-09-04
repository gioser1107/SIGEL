import './LogoMarca.css';

interface LogoMarcaProps {
  compacto?: boolean;
}

export default function LogoMarca({ compacto = false }: LogoMarcaProps) {
  return (
    <div className={`logo-marca ${compacto ? 'logo-marca--compacto' : ''}`}>
      <div className="logo-marca__icono" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5L21 16z"
            fill="currentColor"
          />
        </svg>
      </div>
      <div className="logo-marca__texto">
        <strong>
          Travel<span>Bqto</span>
        </strong>
        {!compacto && <span className="logo-marca__eslogan">Turismo · Barquisimeto, Lara</span>}
      </div>
    </div>
  );
}
