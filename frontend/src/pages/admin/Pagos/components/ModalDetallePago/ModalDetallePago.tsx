import { useEffect } from 'react';
import Boton from '../../../../../components/ui/Boton/Boton';
import type { PagoReserva } from '../../../../../types/pagos';
import { useDetallePagoAdmin } from '../../hooks/useDetallePagoAdmin';
import ContenidoDetallePago from './ContenidoDetallePago';
import './ModalDetallePago.css';

interface ModalDetallePagoProps {
  abierto: boolean;
  reservaId: number | null;
  pagoId: number | null;
  pagoInicial?: PagoReserva | null;
  onCerrar: () => void;
}

export default function ModalDetallePago({
  abierto,
  reservaId,
  pagoId,
  pagoInicial,
  onCerrar,
}: ModalDetallePagoProps) {
  const { detalle, cargando, error, cargar, limpiar } = useDetallePagoAdmin();

  useEffect(() => {
    if (abierto && reservaId && pagoId) {
      void cargar(reservaId, pagoId, pagoInicial);
    } else {
      limpiar();
    }
  }, [abierto, reservaId, pagoId, pagoInicial, cargar, limpiar]);

  useEffect(() => {
    function alPresionarTecla(e: KeyboardEvent) {
      if (e.key === 'Escape' && abierto) onCerrar();
    }
    document.addEventListener('keydown', alPresionarTecla);
    return () => document.removeEventListener('keydown', alPresionarTecla);
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  const pagoMostrar = detalle ?? pagoInicial;

  return (
    <div className="modal-detalle-pago__superposicion" onClick={onCerrar} role="presentation">
      <div
        className="modal-detalle-pago"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-detalle-pago-titulo"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-detalle-pago__cabecera">
          <div>
            <span className="modal-detalle-pago__etiqueta">Detalle de pago</span>
            <h2 id="modal-detalle-pago-titulo" className="modal-detalle-pago__titulo">
              Pago #{pagoId}
            </h2>
          </div>
          <button
            type="button"
            className="modal-detalle-pago__cerrar"
            onClick={onCerrar}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="modal-detalle-pago__cuerpo">
          {cargando && !pagoMostrar && <p className="modal-detalle-pago__estado">Cargando detalle…</p>}
          {error && <p className="modal-detalle-pago__error" role="alert">{error}</p>}
          {pagoMostrar && <ContenidoDetallePago pago={pagoMostrar} />}
        </div>

        <div className="modal-detalle-pago__pie">
          <Boton variante="secundario" tamano="sm" onClick={onCerrar}>
            Cerrar
          </Boton>
        </div>
      </div>
    </div>
  );
}
