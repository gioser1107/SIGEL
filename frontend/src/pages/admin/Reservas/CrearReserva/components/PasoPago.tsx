import Boton from '../../../../../components/ui/Boton/Boton';
import PagosReserva from '../../Pagos/PagosReserva';

interface PasoPagoProps {
  reservaId: number;
  cargando: boolean;
  onAtras: () => void;
  onFinalizar: () => void;
}

export default function PasoPago({
  reservaId,
  cargando,
  onAtras,
  onFinalizar,
}: PasoPagoProps) {
  return (
    <div className="step-content">
      <div className="paso-header">
        <div className="paso-header__info">
          <span className="paso-seccion-label">Paso 4 de 4</span>
          <h2 className="paso-titulo">Pagos</h2>
          <p className="paso-subtitulo">
            Reserva RES-{reservaId} creada. Registra los pagos del cliente antes de finalizar.
          </p>
        </div>
      </div>

      <PagosReserva reservaId={reservaId} />

      <div className="crear-reserva-admin__actions">
        <Boton variante="secundario" onClick={onAtras} disabled={cargando}>
          Atrás
        </Boton>
        <Boton variante="primario" onClick={onFinalizar} disabled={cargando}>
          Finalizar
        </Boton>
      </div>
    </div>
  );
}
