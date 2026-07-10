import { useState } from 'react';
import { TablaDatos, BotonAccionTabla } from '../../../../../components/admin';
import { actualizarPagoReserva, aprobarPagoReserva } from '../../../../../services/pagos';
import type { PagoReserva } from '../../../../../types/pagos';
import ModalDetallePago from '../../../Pagos/components/ModalDetallePago/ModalDetallePago';
import ModalEliminarPago from '../EliminarPago/ModalEliminarPago';
import { columnasPagosReserva } from '../components/columnasPagosReserva';
import { mensajeErrorPago } from '../utils/mensajeError';

interface TablaPagosReservaProps {
  reservaId: number;
  pagos: PagoReserva[];
  cargando: boolean;
  puedeEditar: boolean;
  puedeBorrar: boolean;
  onActualizado: () => void;
  onError: (mensaje: string) => void;
}

export default function TablaPagosReserva({
  reservaId,
  pagos,
  cargando,
  puedeEditar,
  puedeBorrar,
  onActualizado,
  onError,
}: TablaPagosReservaProps) {
  const [pagoAEliminar, setPagoAEliminar] = useState<PagoReserva | null>(null);
  const [pagoAVer, setPagoAVer] = useState<PagoReserva | null>(null);
  const [procesando, setProcesando] = useState(false);

  async function cambiarEstado(pago: PagoReserva, estado: 'aprobado' | 'rechazado') {
    setProcesando(true);
    try {
      if (estado === 'aprobado') {
        await aprobarPagoReserva(reservaId, pago.id);
      } else {
        await actualizarPagoReserva(reservaId, pago.id, { estado });
      }
      onActualizado();
    } catch (err) {
      onError(mensajeErrorPago(err));
    } finally {
      setProcesando(false);
    }
  }

  const hayAccionesGestion = puedeEditar || puedeBorrar;

  return (
    <>
      <TablaDatos
        columnas={columnasPagosReserva}
        datos={pagos}
        cargando={cargando}
        mensajeVacio="No hay pagos registrados para esta reserva."
        idFila={(p) => p.id}
        onFilaClick={(p) => setPagoAVer(p)}
        accionesFila={(p) => (
          <>
            <BotonAccionTabla
              accion="ver"
              onClick={(e) => { e.stopPropagation(); setPagoAVer(p); }}
            />
            {hayAccionesGestion && puedeEditar && p.estado === 'en_validacion' && (
              <>
                <BotonAccionTabla
                  accion="aprobar"
                  disabled={procesando}
                  onClick={(e) => { e.stopPropagation(); cambiarEstado(p, 'aprobado'); }}
                />
                <BotonAccionTabla
                  accion="rechazar"
                  disabled={procesando}
                  onClick={(e) => { e.stopPropagation(); cambiarEstado(p, 'rechazado'); }}
                />
              </>
            )}
            {hayAccionesGestion && puedeBorrar && (
              <BotonAccionTabla
                accion="eliminar"
                disabled={procesando}
                onClick={(e) => { e.stopPropagation(); setPagoAEliminar(p); }}
              />
            )}
          </>
        )}
      />

      <ModalDetallePago
        abierto={Boolean(pagoAVer)}
        reservaId={pagoAVer ? reservaId : null}
        pagoId={pagoAVer?.id ?? null}
        pagoInicial={pagoAVer}
        onCerrar={() => setPagoAVer(null)}
      />

      <ModalEliminarPago
        abierto={Boolean(pagoAEliminar)}
        reservaId={reservaId}
        pago={pagoAEliminar}
        onCerrar={() => setPagoAEliminar(null)}
        onEliminado={onActualizado}
        onError={onError}
      />
    </>
  );
}
