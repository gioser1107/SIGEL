import './LogoMarca.css';

/**
 * Opcional: en `.env` pon VITE_LOGO_MARCA=/marca/logo.png
 * y deja el archivo en frontend/public/marca/logo.png.
 * Si no está definido, no se pide ninguna imagen (evita 404 y lentitud).
 */
const RUTA_LOGO = (import.meta.env.VITE_LOGO_MARCA as string | undefined)?.trim();

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
      {RUTA_LOGO ? (
        <img className="logo-marca__archivo" src={RUTA_LOGO} alt="TravelBqto" />
      ) : (
        <>
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
            {!compacto && (
              <span className="logo-marca__eslogan">Turismo y excursiones</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
