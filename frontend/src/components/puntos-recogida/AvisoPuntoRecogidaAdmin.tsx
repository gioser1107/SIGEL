import { Link } from 'react-router-dom';
import './puntos-recogida.css';

interface AvisoPuntoRecogidaAdminProps {
  compacto?: boolean;
}

export default function AvisoPuntoRecogidaAdmin({ compacto = false }: AvisoPuntoRecogidaAdminProps) {
  return (
    <div className={`pr-aviso-admin${compacto ? ' pr-aviso-admin--compacto' : ''}`} role="note">
      <p className="pr-aviso-admin__texto">
        <strong>¿Necesitas otro domicilio?</strong>{' '}
        Regístralo en tu perfil con dirección exacta y referencias para que la agencia te encuentre.
      </p>
      <Link to="/client/puntos-recogida" className="pr-aviso-admin__link">
        Gestionar mis domicilios
      </Link>
    </div>
  );
}
