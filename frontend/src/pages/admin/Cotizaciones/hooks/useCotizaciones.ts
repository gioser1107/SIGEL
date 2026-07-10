import { useCallback, useEffect, useMemo, useState } from 'react';
import { useVistaModuloResponsive } from '../../../../hooks/useVistaModuloResponsive';
import { usePaginacionListado } from '../../../../hooks/usePaginacionListado';
import {
  actualizarCotizacion,
  crearCotizacion,
  crearLineaCotizacion,
  eliminarCotizacion,
  eliminarLineaCotizacion,
  obtenerCotizaciones,
  obtenerLineasCotizacion,
  obtenerResumenLineasCotizacion,
} from '../../../../services/cotizaciones';
import { listarDestinosParaSelect } from '../../../../services/destinos';
import type {
  Cotizacion,
  CotizacionLinea,
  DatosCotizacionNueva,
  EstadoCotizacion,
} from '../../../../types/cotizacion';
import type { FiltroListado } from '../../../../types/paginacion';
import type { OpcionSelectBuscador } from '../../../../components/admin';
import { FORM_VACIO, LINEA_FORM_VACIO } from '../constants';
import { etiquetaCliente } from '../utils/formatearCotizacion';
import { validarFormularioCotizacion } from '../../../../utils/validacionesFormulario';

export function useCotizaciones() {
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroTab, setFiltroTab] = useState<FiltroListado>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [vista, setVista] = useVistaModuloResponsive();

  const [drawerAbierto, setDrawerAbierto] = useState(false);
  const [drawerModo, setDrawerModo] = useState<'crear' | 'editar'>('crear');
  const [cotizacionActiva, setCotizacionActiva] = useState<Cotizacion | null>(null);

  const [form, setForm] = useState<DatosCotizacionNueva>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  const [confirmAbierto, setConfirmAbierto] = useState(false);
  const [cotizacionARechazar, setCotizacionARechazar] = useState<Cotizacion | null>(null);
  const [rechazando, setRechazando] = useState(false);

  const [convertirAbierto, setConvertirAbierto] = useState(false);

  const [drawerTab, setDrawerTab] = useState<'info' | 'desglose'>('info');
  const [lineas, setLineas] = useState<CotizacionLinea[]>([]);
  const [lineaForm, setLineaForm] = useState(LINEA_FORM_VACIO);
  const [cargandoLineas, setCargandoLineas] = useState(false);
  const [destinosOpciones, setDestinosOpciones] = useState<OpcionSelectBuscador[]>([]);
  const [cargandoDestinos, setCargandoDestinos] = useState(false);
  const { pagina, setTotal, total, totalPaginas, irPagina, reiniciarPagina, limite } = usePaginacionListado();

  // Extrae clientes únicos del listado para poblar el select de creación
  const clientesOpciones = useMemo(() => {
    const mapa = new Map<number, string>();
    for (const c of cotizaciones) {
      if (c.cliente_id) mapa.set(c.cliente_id, etiquetaCliente(c));
    }
    return Array.from(mapa.entries()).map(([id, etiqueta]) => ({ id, etiqueta }));
  }, [cotizaciones]);

  const cargarDestinos = useCallback(async () => {
    setCargandoDestinos(true);
    try {
      const destinos = await listarDestinosParaSelect();
      setDestinosOpciones(
        destinos.map((d) => ({
          valor: d.id,
          etiqueta: d.nombre,
          busqueda: [d.nombre, d.descripcion ?? ''].join(' ').trim(),
        })),
      );
    } catch {
      setDestinosOpciones([]);
    } finally {
      setCargandoDestinos(false);
    }
  }, []);

  useEffect(() => {
    if (drawerAbierto && drawerModo === 'crear') {
      cargarDestinos();
    }
  }, [drawerAbierto, drawerModo, cargarDestinos]);

  // Carga el listado completo de cotizaciones desde la API
  const cargarCotizaciones = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const respuesta = await obtenerCotizaciones({
        pagina,
        limite,
        ...(filtroTab !== 'todos' ? { filtro: filtroTab } : {}),
      });
      setCotizaciones(respuesta.items);
      setTotal(respuesta.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar cotizaciones');
    } finally {
      setCargando(false);
    }
  }, [filtroTab, pagina, limite, setTotal]);

  useEffect(() => {
    cargarCotizaciones();
  }, [cargarCotizaciones]);

  // Carga las líneas de desglose y actualiza el precio total si hay resumen
  const cargarLineas = async (cotizacionId: number) => {
    setCargandoLineas(true);
    try {
      const [lista, resumen] = await Promise.all([
        obtenerLineasCotizacion(cotizacionId),
        obtenerResumenLineasCotizacion(cotizacionId),
      ]);
      setLineas(lista);
      if (resumen.total_eur > 0) {
        setForm((f) => ({ ...f, precio_cotizado_eur: resumen.total_eur }));
        setCotizacionActiva((prev) =>
          prev ? { ...prev, precio_cotizado_eur: resumen.total_eur } : prev,
        );
      }
    } catch {
      setLineas([]);
    } finally {
      setCargandoLineas(false);
    }
  };

  // Abre el drawer en modo creación con formulario vacío
  const abrirCrear = () => {
    setDrawerModo('crear');
    setDrawerTab('info');
    setLineas([]);
    setCotizacionActiva(null);
    setForm(FORM_VACIO);
    setErrorForm(null);
    setDrawerAbierto(true);
  };

  // Abre el drawer en modo edición y carga el desglose de la cotización
  const abrirEditar = (cot: Cotizacion) => {
    setDrawerModo('editar');
    setDrawerTab('info');
    setCotizacionActiva(cot);
    setForm({
      cliente_id: cot.cliente_id,
      destino_id: cot.destino_id,
      requisitos: cot.requisitos ?? '',
      precio_cotizado_eur: cot.precio_cotizado_eur,
      valida_hasta: cot.valida_hasta,
      estado: cot.estado,
    });
    setErrorForm(null);
    setDrawerAbierto(true);
    cargarLineas(cot.id);
  };

  // Cierra el drawer y limpia el estado del formulario y líneas
  const cerrarDrawer = () => {
    setDrawerAbierto(false);
    setCotizacionActiva(null);
    setLineas([]);
    setDrawerTab('info');
    setErrorForm(null);
  };

  // Valida y guarda la cotización (crear o actualizar según el modo)
  const guardar = async () => {
    const errorValidacion = validarFormularioCotizacion(form);
    if (errorValidacion) {
      setErrorForm(errorValidacion);
      return;
    }
    setGuardando(true);
    setErrorForm(null);
    try {
      if (drawerModo === 'crear') {
        await crearCotizacion(form);
      } else if (cotizacionActiva) {
        await actualizarCotizacion(cotizacionActiva.id, {
          requisitos: form.requisitos,
          precio_cotizado_eur: form.precio_cotizado_eur,
          valida_hasta: form.valida_hasta,
          estado: form.estado,
        });
      }
      await cargarCotizaciones();
      cerrarDrawer();
    } catch (e) {
      setErrorForm(e instanceof Error ? e.message : 'Error al guardar cotización');
    } finally {
      setGuardando(false);
    }
  };

  // Agrega una línea de desglose y recalcula el precio total
  const agregarLinea = async () => {
    if (!cotizacionActiva || !lineaForm.monto_eur) return;
    try {
      const res = await crearLineaCotizacion(cotizacionActiva.id, {
        categoria: lineaForm.categoria,
        monto_eur: Number(lineaForm.monto_eur),
        descripcion: lineaForm.descripcion || null,
      });
      setLineas((prev) => [...prev, res.linea]);
      setForm((f) => ({ ...f, precio_cotizado_eur: res.cotizacion.precio_cotizado_eur }));
      setCotizacionActiva((prev) =>
        prev ? { ...prev, precio_cotizado_eur: res.cotizacion.precio_cotizado_eur } : prev,
      );
      setLineaForm(LINEA_FORM_VACIO);
      await cargarCotizaciones();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al agregar línea');
    }
  };

  // Elimina una línea de desglose y actualiza el precio total
  const quitarLinea = async (lineaId: number) => {
    if (!cotizacionActiva) return;
    try {
      const res = await eliminarLineaCotizacion(cotizacionActiva.id, lineaId);
      setLineas((prev) => prev.filter((l) => l.id !== lineaId));
      setForm((f) => ({ ...f, precio_cotizado_eur: res.cotizacion.precio_cotizado_eur }));
      await cargarCotizaciones();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al eliminar línea');
    }
  };

  // Cambia el estado de la cotización vía API y sincroniza el drawer si está abierto
  const cambiarEstado = async (cot: Cotizacion, nuevoEstado: EstadoCotizacion) => {
    try {
      await actualizarCotizacion(cot.id, { estado: nuevoEstado });
      await cargarCotizaciones();
      if (cotizacionActiva?.id === cot.id) {
        setCotizacionActiva((prev) => (prev ? { ...prev, estado: nuevoEstado } : prev));
        setForm((f) => ({ ...f, estado: nuevoEstado }));
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al cambiar estado');
    }
  };

  // Abre el modal de confirmación para rechazar/eliminar una cotización
  const confirmarRechazar = (cot: Cotizacion) => {
    if (drawerAbierto) cerrarDrawer();
    setCotizacionARechazar(cot);
    setConfirmAbierto(true);
  };

  // Ejecuta la eliminación de la cotización rechazada
  const ejecutarRechazar = async () => {
    if (!cotizacionARechazar) return;
    setRechazando(true);
    try {
      await eliminarCotizacion(cotizacionARechazar.id);
      setConfirmAbierto(false);
      setCotizacionARechazar(null);
      setFiltroTab('anulado');
      reiniciarPagina();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al rechazar cotización');
    } finally {
      setRechazando(false);
    }
  };

  // Cierra el modal de rechazo sin ejecutar la acción
  const cancelarRechazar = () => {
    setConfirmAbierto(false);
    setCotizacionARechazar(null);
  };

  // Aplica búsqueda local y filtro por pestaña sobre el listado
  const cotizacionesFiltradas = cotizaciones.filter((c) => {
    const texto = busqueda.toLowerCase();
    return (
      !texto ||
      (c.cliente_nombre ?? '').toLowerCase().includes(texto) ||
      (c.cliente_razon_social ?? '').toLowerCase().includes(texto) ||
      (c.destino_nombre ?? '').toLowerCase().includes(texto)
    );
  });

  return {
    cotizaciones,
    cotizacionesFiltradas,
    cargando,
    error,
    filtroTab,
    busqueda,
    vista,
    drawerAbierto,
    drawerModo,
    cotizacionActiva,
    form,
    guardando,
    errorForm,
    confirmAbierto,
    cotizacionARechazar,
    rechazando,
    convertirAbierto,
    drawerTab,
    lineas,
    lineaForm,
    cargandoLineas,
    clientesOpciones,
    destinosOpciones,
    cargandoDestinos,
    pagina,
    total,
    totalPaginas,
    irPagina,
    reiniciarPagina,
    limite,
    setFiltroTab,
    setBusqueda,
    setVista,
    setForm,
    setDrawerTab,
    setLineaForm,
    setConvertirAbierto,
    abrirCrear,
    abrirEditar,
    cerrarDrawer,
    guardar,
    agregarLinea,
    quitarLinea,
    cambiarEstado,
    confirmarRechazar,
    ejecutarRechazar,
    cancelarRechazar,
  };
}
