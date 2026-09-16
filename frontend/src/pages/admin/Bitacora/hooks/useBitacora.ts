import { useCallback, useEffect, useState } from 'react';
import { obtenerBitacora, obtenerDetalleBitacora } from '../../../../services/bitacora';
import type { DetalleBitacora, EntradaBitacora } from '../../../../types/bitacora';
import { LIMITE_PAGINA } from '../constants';

export function useBitacora() {
  const [registros, setRegistros] = useState<EntradaBitacora[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [busqueda, setBusqueda] = useState('');
  const [filtroModulo, setFiltroModulo] = useState('');
  const [filtroAccion, setFiltroAccion] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  const [panelAbierto, setPanelAbierto] = useState(false);
  const [entradaActiva, setEntradaActiva] = useState<DetalleBitacora | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  const cargarBitacora = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const respuesta = await obtenerBitacora({
        q: busqueda.trim() || undefined,
        modulo: filtroModulo || undefined,
        accion: filtroAccion || undefined,
        fecha_desde: fechaDesde ? `${fechaDesde}T00:00:00` : undefined,
        fecha_hasta: fechaHasta ? `${fechaHasta}T23:59:59` : undefined,
        pagina,
        limite: LIMITE_PAGINA,
      });
      setRegistros(respuesta.items);
      setTotal(respuesta.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar la bitácora');
    } finally {
      setCargando(false);
    }
  }, [busqueda, filtroModulo, filtroAccion, fechaDesde, fechaHasta, pagina]);

  useEffect(() => {
    cargarBitacora();
  }, [cargarBitacora]);

  const totalPaginas = Math.max(1, Math.ceil(total / LIMITE_PAGINA));

  const abrirDetalle = async (entrada: EntradaBitacora) => {
    setPanelAbierto(true);
    setCargandoDetalle(true);
    setEntradaActiva(null);
    try {
      const detalle = await obtenerDetalleBitacora(entrada.id);
      setEntradaActiva(detalle);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar el detalle');
      setPanelAbierto(false);
    } finally {
      setCargandoDetalle(false);
    }
  };

  const cerrarPanel = () => {
    setPanelAbierto(false);
    setEntradaActiva(null);
  };

  const reiniciarPagina = () => setPagina(1);

  const cambiarBusqueda = (valor: string) => {
    setBusqueda(valor);
    reiniciarPagina();
  };

  const cambiarFiltroModulo = (valor: string) => {
    setFiltroModulo(valor);
    reiniciarPagina();
  };

  const cambiarFiltroAccion = (valor: string) => {
    setFiltroAccion(valor);
    reiniciarPagina();
  };

  const cambiarFechaDesde = (valor: string) => {
    setFechaDesde(valor);
    reiniciarPagina();
  };

  const cambiarFechaHasta = (valor: string) => {
    setFechaHasta(valor);
    reiniciarPagina();
  };

  const irPagina = (nuevaPagina: number) => {
    setPagina(Math.max(1, Math.min(totalPaginas, nuevaPagina)));
  };

  return {
    registros,
    total,
    pagina,
    totalPaginas,
    cargando,
    error,
    busqueda,
    filtroModulo,
    filtroAccion,
    fechaDesde,
    fechaHasta,
    panelAbierto,
    entradaActiva,
    cargandoDetalle,
    abrirDetalle,
    cerrarPanel,
    cambiarBusqueda,
    cambiarFiltroModulo,
    cambiarFiltroAccion,
    cambiarFechaDesde,
    cambiarFechaHasta,
    irPagina,
  };
}
