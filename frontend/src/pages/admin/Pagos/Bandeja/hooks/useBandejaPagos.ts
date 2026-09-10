import { useCallback, useEffect, useState } from 'react';
import { LIMITE_PAGINA_DEFAULT } from '../../../../../types/paginacion';
import { usePaginacionListado } from '../../../../../hooks/usePaginacionListado';
import {
  actualizarPagoReserva,
  aprobarPagoReserva,
  listarPagosGlobal,
  obtenerCatalogoPagos,
} from '../../../../../services/pagos';
import type { EstadoPago, MetodoPago, PagoGlobal } from '../../../../../types/pagos';
import { mensajeError } from '../../utils/mensajeError';
import { FILTROS_BANDEJA_VACIOS, type FiltrosBandeja } from '../constants';

interface UseBandejaPagosParams {
  activo: boolean;
  onExito: (mensaje: string) => void;
  onError: (mensaje: string) => void;
}

export function useBandejaPagos({ activo, onExito, onError }: UseBandejaPagosParams) {
  const [datos, setDatos] = useState<PagoGlobal[]>([]);
  const [metodos, setMetodos] = useState<MetodoPago[]>([]);
  const [cargando, setCargando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [filtros, setFiltros] = useState<FiltrosBandeja>(FILTROS_BANDEJA_VACIOS);
  const [filtrosAplicados, setFiltrosAplicados] = useState<FiltrosBandeja>(FILTROS_BANDEJA_VACIOS);
  const [pagoAEliminar, setPagoAEliminar] = useState<PagoGlobal | null>(null);
  const [pagoAConfirmar, setPagoAConfirmar] = useState<{
    pago: PagoGlobal;
    estado: 'aprobado' | 'rechazado';
  } | null>(null);

  const {
    pagina,
    setTotal,
    total,
    totalPaginas,
    irPagina,
    reiniciarPagina,
    limite,
  } = usePaginacionListado(LIMITE_PAGINA_DEFAULT);

  useEffect(() => {
    if (!activo || metodos.length > 0) return;
    obtenerCatalogoPagos()
      .then((cat) => setMetodos(cat.metodos_pago))
      .catch((err) => onError(mensajeError(err, 'métodos de pago')));
  }, [activo, metodos.length, onError]);

  const recargar = useCallback(async () => {
    setCargando(true);
    try {
      const params: Parameters<typeof listarPagosGlobal>[0] = {
        pagina,
        limite,
      };
      if (filtrosAplicados.estado) params.estado = filtrosAplicados.estado as EstadoPago;
      if (filtrosAplicados.reserva_id) params.reserva_id = Number(filtrosAplicados.reserva_id);
      if (filtrosAplicados.metodo_pago_id) params.metodo_pago_id = Number(filtrosAplicados.metodo_pago_id);
      if (filtrosAplicados.fecha_desde) params.fecha_desde = filtrosAplicados.fecha_desde;
      if (filtrosAplicados.fecha_hasta) params.fecha_hasta = filtrosAplicados.fecha_hasta;

      const respuesta = await listarPagosGlobal(params);
      setDatos(respuesta.items);
      setTotal(respuesta.total);
    } catch (err) {
      onError(mensajeError(err, 'pagos'));
    } finally {
      setCargando(false);
    }
  }, [filtrosAplicados, pagina, limite, onError, setTotal]);

  useEffect(() => {
    if (activo) recargar();
  }, [activo, recargar]);

  function pedirCambioEstado(pago: PagoGlobal, estado: 'aprobado' | 'rechazado') {
    setPagoAConfirmar({ pago, estado });
  }

  async function confirmarCambioEstado() {
    if (!pagoAConfirmar) return;
    const { pago, estado } = pagoAConfirmar;
    setProcesando(true);
    try {
      if (estado === 'aprobado') {
        await aprobarPagoReserva(pago.reserva_id, pago.id);
      } else {
        await actualizarPagoReserva(pago.reserva_id, pago.id, { estado });
      }
      onExito(estado === 'aprobado'
        ? 'Pago aprobado. Ya suma al saldo de la reserva.'
        : 'Pago rechazado. No afecta el saldo cobrado.');
      setPagoAConfirmar(null);
      await recargar();
    } catch (err) {
      onError(mensajeError(err, 'pagos'));
    } finally {
      setProcesando(false);
    }
  }

  function aplicarFiltros() {
    reiniciarPagina();
    setFiltrosAplicados({ ...filtros });
  }

  function cambiarPestania(id: string) {
    const estado = id === 'todos' ? '' : id;
    setFiltros((actual) => ({ ...actual, estado }));
    reiniciarPagina();
    setFiltrosAplicados((actual) => ({ ...actual, estado }));
  }

  function limpiarFiltrosExtra() {
    reiniciarPagina();
    setFiltros((actual) => ({
      ...FILTROS_BANDEJA_VACIOS,
      estado: actual.estado,
    }));
    setFiltrosAplicados((actual) => ({
      ...FILTROS_BANDEJA_VACIOS,
      estado: actual.estado,
    }));
  }

  return {
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
  };
}
