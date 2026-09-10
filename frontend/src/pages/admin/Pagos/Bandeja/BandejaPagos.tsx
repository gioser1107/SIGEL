import { useState } from 'react';
import {
  TablaDatos,
  BotonAccionTabla,
  PaginacionTabla,
  PestaniasFiltro,
  ModalConfirmacion,
} from '../../../../components/admin';
import type { PagoGlobal } from '../../../../types/pagos';
import type { PropsSeccionPagos } from '../types';
import ModalDetallePago from '../components/ModalDetallePago/ModalDetallePago';
import ModalEliminarPago from './EliminarPago/ModalEliminarPago';
import FiltrosBandejaPagos from './components/FiltrosBandejaPagos';
import { columnasBandejaPagos } from './components/columnasBandejaPagos';
import { useBandejaPagos } from './hooks/useBandejaPagos';
import {
  PESTANIAS_BANDEJA,
  idPestaniaBandeja,
  mensajeConfirmarEstado,
  mensajeVacioBandeja,
  resumenListaBandeja,
} from './constants';

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
    filtrosAplicados,
    setFiltros,
    aplicarFiltros,
    cambiarPestania,
    limpiarFiltrosExtra,
    pedirCambioEstado,
    confirmarCambioEstado,
    pagoAConfirmar,
    setPagoAConfirmar,
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

  const confirmacion = pagoAConfirmar
    ? mensajeConfirmarEstado(pagoAConfirmar.pago.reserva_id, pagoAConfirmar.estado)
    : null;

  function solicitarValidacion(pago: PagoGlobal, estado: 'aprobado' | 'rechazado') {
    setPagoAVer(null);
    pedirCambioEstado(pago, estado);
  }

  return (
    <>
      <PestaniasFiltro
        pestanias={PESTANIAS_BANDEJA}
        activa={idPestaniaBandeja(filtros.estado)}
        onChange={cambiarPestania}
      />

      {filtrosAplicados.estado === 'en_validacion' && (
        <p className="pagos-admin__guia">
          Abre un pago para ver el comprobante. <strong>Aprobar</strong> lo suma a la reserva.
          {' '}<strong>Rechazar</strong> lo deja sin efecto en el saldo cobrado.
        </p>
      )}

      <FiltrosBandejaPagos
        filtros={filtros}
        metodos={metodos}
        onChange={setFiltros}
        onAplicar={aplicarFiltros}
        onLimpiar={limpiarFiltrosExtra}
      />

      <div className="pagos-admin__resumen-lista">
        <p>{resumenListaBandeja(total, filtrosAplicados.estado)}</p>
        <p className="pagos-admin__nota">
          El asterisco (*) en euros significa conversión aproximada (dólares sin tasa USD).
        </p>
      </div>

      <TablaDatos
        columnas={columnasBandejaPagos}
        datos={datos}
        cargando={cargando}
        mensajeVacio={mensajeVacioBandeja(filtrosAplicados.estado)}
        idFila={(p) => p.id}
        onFilaClick={(p) => setPagoAVer(p)}
        accionesFila={(p) => (
          <>
            <BotonAccionTabla
              accion="ver"
              titulo="Ver comprobante y detalle"
              onClick={(e) => { e.stopPropagation(); setPagoAVer(p); }}
            />
            {puedeEditar && p.estado === 'en_validacion' && (
              <>
                <BotonAccionTabla
                  accion="aprobar"
                  titulo="Aprobar y sumar a la reserva"
                  disabled={procesando}
                  onClick={(e) => { e.stopPropagation(); solicitarValidacion(p, 'aprobado'); }}
                />
                <BotonAccionTabla
                  accion="rechazar"
                  titulo="Rechazar este pago"
                  disabled={procesando}
                  onClick={(e) => { e.stopPropagation(); solicitarValidacion(p, 'rechazado'); }}
                />
              </>
            )}
            {puedeBorrar && (
              <BotonAccionTabla
                accion="eliminar"
                titulo="Eliminar este reporte"
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
        puedeValidar={puedeEditar && pagoAVer?.estado === 'en_validacion'}
        procesando={procesando}
        onAprobar={pagoAVer ? () => solicitarValidacion(pagoAVer, 'aprobado') : undefined}
        onRechazar={pagoAVer ? () => solicitarValidacion(pagoAVer, 'rechazado') : undefined}
      />

      <ModalConfirmacion
        abierto={Boolean(pagoAConfirmar)}
        titulo={confirmacion?.titulo ?? ''}
        mensaje={confirmacion?.mensaje ?? ''}
        textoConfirmar={confirmacion?.textoConfirmar}
        variante={confirmacion?.variante}
        cargando={procesando}
        onConfirmar={confirmarCambioEstado}
        onCancelar={() => setPagoAConfirmar(null)}
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
