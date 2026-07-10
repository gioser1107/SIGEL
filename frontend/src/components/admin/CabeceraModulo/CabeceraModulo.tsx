import type { ReactNode } from 'react';
import './CabeceraModulo.css';

interface CabeceraModuloProps {
  migaja?: string;
  titulo: string;
  contador?: number;
  descripcion?: string;
  acciones?: ReactNode;
}

export default function CabeceraModulo({
  migaja,
  titulo,
  contador,
  descripcion,
  acciones,
}: CabeceraModuloProps) {
  return (
    <div className="cabecera-modulo">
      <div className="cabecera-modulo__info">
        {migaja && <p className="cabecera-modulo__migaja">{migaja}</p>}
        <div className="cabecera-modulo__titulo-fila">
          <h1 className="cabecera-modulo__titulo">{titulo}</h1>
          {contador !== undefined && (
            <span className="cabecera-modulo__contador">{contador}</span>
          )}
        </div>
        {descripcion && <p className="cabecera-modulo__descripcion">{descripcion}</p>}
      </div>
      {acciones && <div className="cabecera-modulo__acciones">{acciones}</div>}
    </div>
  );
}
