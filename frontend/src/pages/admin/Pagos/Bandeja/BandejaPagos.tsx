import { useState } from 'react';
import { TablaDatos, BotonAccionTabla, PaginacionTabla } from '../../../../components/admin';
import type { PagoGlobal } from '../../../../types/pagos';
import type { PropsSeccionPagos } from '../types';
import ModalDetallePago from '../components/ModalDetallePago/ModalDetallePago';
import ModalEliminarPago from './EliminarPago/ModalEliminarPago';
import FiltrosBandejaPagos from './components/FiltrosBandejaPagos';
import { columnasBandejaPagos } from './components/columnasBandejaPagos';
import { useBandejaPagos } from './hooks/useBandejaPagos';

export default function BandejaPagos({
  activo,
  puedeEditar,
  puedeBorrar,
  onExito,
  onError,
}: PropsSeccionPagos) {
  const [pagoAVer, setPagoAVer] = useState<PagoGlobal | null>(null);
  const {
    datos,
    metodos,
    cargando,
    procesando,
    filtros,
    setFiltros,
    aplicarFiltros,
    restablecerFiltros,
    cambiarEstado,
    pagoAEliminar,
    setPagoAEliminar,
    recargar,
    pagina,
    total,
    totalPaginas,
    irPagina,
    limite,
  } = useBandejaPagos({ activo, onExito, onError });

  if (!activo) return null;

  return (
    <>
      <FiltrosBandejaPagos
        filtros={filtros}
        metodos={metodos}
        onChange={setFiltros}
        onAplicar={aplicarFiltros}
        onRestablecer={restablecerFiltros}
      />

      <p className="pagos-admin__nota">
        Los pagos con * tienen conversión EUR aproximada (USD sin tasa USD).
      </p>
      <TablaDatos
        columnas={columnasBandejaPagos}
        datos={datos}
        cargando={cargando}
        mensajeVacio="No hay pagos con los filtros seleccionados."
        idFila={(p) => p.id}
        onFilaClick={(p) => setPagoAVer(p)}
        accionesFila={(p) => (
          <>
            <BotonAccionTabla
              accion="ver"
              onClick={(e) => { e.stopPropagation(); setPagoAVer(p); }}
            />
            {puedeEditar && p.estado === 'en_validacion' && (
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
            {puedeBorrar && (
              <BotonAccionTabla
                accion="eliminar"
                disabled={procesando}
                onClick={(e) => { e.stopPropagation(); setPagoAEliminar(p); }}
              />
            )}
          </>
        )}
      />

      <PaginacionTabla
        pagina={pagina}
        totalPaginas={totalPaginas}
        total={total}
        limite={limite}
        onPaginaChange={irPagina}
      />

      <ModalDetallePago
        abierto={Boolean(pagoAVer)}
        reservaId={pagoAVer?.reserva_id ?? null}
        pagoId={pagoAVer?.id ?? null}
        pagoInicial={pagoAVer}
        onCerrar={() => setPagoAVer(null)}
      />

      <ModalEliminarPago
        abierto={Boolean(pagoAEliminar)}
        pago={pagoAEliminar}
        onCerrar={() => setPagoAEliminar(null)}
        onExito={onExito}
        onError={onError}
        onRecargar={recargar}
      />
    </>
  );
}
