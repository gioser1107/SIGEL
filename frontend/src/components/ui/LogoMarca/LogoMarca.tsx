import './LogoMarca.css';

/**
 * Logo circular de Travel BQTO.
 * Por defecto usa /marca/logo.webp. Se puede overridear con VITE_LOGO_MARCA.
 */
const RUTA_LOGO =
  (import.meta.env.VITE_LOGO_MARCA as string | undefined)?.trim() || '/marca/logo.webp';

interface LogoMarcaProps {
  compacto?: boolean;
  sobreOscuro?: boolean;
}

export default function LogoMarca({ compacto = false, sobreOscuro = false }: LogoMarcaProps) {
  const clases = [
    'logo-marca',
    compacto ? 'logo-marca--compacto' : '',
    sobreOscuro ? 'logo-marca--sobre-oscuro' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={clases}>
      <img className="logo-marca__archivo" src={RUTA_LOGO} alt="" />
      <div className="logo-marca__texto">
        <strong>
          Travel<span>Bqto</span>
        </strong>
        {!compacto && <span className="logo-marca__eslogan">Turismo y excursiones</span>}
      </div>
    </div>
  );
}
