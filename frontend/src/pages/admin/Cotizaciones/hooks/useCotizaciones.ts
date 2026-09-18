import { useCallback, useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { useVistaModuloResponsive } from '../../../../hooks/useVistaModuloResponsive';
import { usePaginacionListado } from '../../../../hooks/usePaginacionListado';
import {
  aceptarCotizacion,
  actualizarCotizacion,
  crearCotizacion,
  crearLineaCotizacion,
  eliminarCotizacion,
  eliminarLineaCotizacion,
  obtenerCotizaciones,
  obtenerLineasCotizacion,
  obtenerResumenLineasCotizacion,
} from '../../../../services/cotizaciones';
import { listarClientesParaSelect } from '../../../../services/clientes';
import { listarDestinosParaSelect } from '../../../../services/destinos';
import type {
  Cotizacion,
  CotizacionLinea,
  DatosCotizacionNueva,
} from '../../../../types/cotizacion';
import type { FiltroListado } from '../../../../types/paginacion';
import type { OpcionSelectBuscador } from '../../../../components/admin';
import { FORM_VACIO, LINEA_FORM_VACIO } from '../constants';
import { validarFormularioCotizacion, validarLineaCotizacion } from '../../../../utils/validacionesFormulario';
import { nombreCompleto } from '../../../../utils/nombrePersona';
import { importeDesdeCantidadYPrecio } from '../utils/formatearCotizacion';

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

  const [pdfCotizacion, setPdfCotizacion] = useState<Cotizacion | null>(null);
  const [pdfLineas, setPdfLineas] = useState<CotizacionLinea[]>([]);
  const [imprimiendoPdf, setImprimiendoPdf] = useState(false);

  const [drawerTab, setDrawerTab] = useState<'info' | 'desglose'>('info');
  const [lineas, setLineas] = useState<CotizacionLinea[]>([]);
  const [lineaForm, setLineaForm] = useState(LINEA_FORM_VACIO);
  const [cargandoLineas, setCargandoLineas] = useState(false);
  const [clientesOpciones, setClientesOpciones] = useState<OpcionSelectBuscador[]>([]);
  const [cargandoClientes, setCargandoClientes] = useState(false);
  const [destinosOpciones, setDestinosOpciones] = useState<OpcionSelectBuscador[]>([]);
  const [cargandoDestinos, setCargandoDestinos] = useState(false);
  const { pagina, setTotal, total, totalPaginas, irPagina, reiniciarPagina, limite } = usePaginacionListado();

  const cargarClientes = useCallback(async () => {
    setCargandoClientes(true);
    try {
      const clientes = await listarClientesParaSelect();
      setClientesOpciones(
        clientes.map((c) => {
          const nombre = nombreCompleto(c.nombre, c.apellido);
          const documento = `${c.tipo_documento}-${c.numero_documento}`;
          const etiqueta = c.razon_social ? `${nombre} — ${c.razon_social}` : nombre;
          return {
            valor: c.cliente_id,
            etiqueta,
            busqueda: [nombre, c.razon_social ?? '', documento, c.correo ?? ''].join(' ').trim(),
          };
        }),
      );
    } catch {
      setClientesOpciones([]);
    } finally {
      setCargandoClientes(false);
    }
  }, []);

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
      cargarClientes();
      cargarDestinos();
    }
  }, [drawerAbierto, drawerModo, cargarClientes, cargarDestinos]);

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

  const abrirCrear = () => {
    setDrawerModo('crear');
    setDrawerTab('info');
    setLineas([]);
    setCotizacionActiva(null);
    setForm(FORM_VACIO);
    setLineaForm(LINEA_FORM_VACIO);
    setErrorForm(null);
    setDrawerAbierto(true);
  };

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
      modalidad: cot.modalidad ?? 'individual',
    });
    setErrorForm(null);
    setDrawerAbierto(true);
    cargarLineas(cot.id);
  };

  const cerrarDrawer = () => {
    setDrawerAbierto(false);
    setCotizacionActiva(null);
    setLineas([]);
    setDrawerTab('info');
    setLineaForm(LINEA_FORM_VACIO);
    setErrorForm(null);
  };

  const guardar = async () => {
    const errorValidacion = validarFormularioCotizacion(form);
    if (errorValidacion) {
      setErrorForm(errorValidacion);
      return;
    }
    if (drawerModo === 'crear' && lineas.length === 0) {
      setErrorForm('Agrega al menos un ítem a la cotización.');
      return;
    }
    setGuardando(true);
    setErrorForm(null);
    try {
      if (drawerModo === 'crear') {
        await crearCotizacion({
          cliente_id: form.cliente_id,
          destino_id: form.destino_id,
          requisitos: form.requisitos,
          valida_hasta: form.valida_hasta,
          modalidad: form.modalidad,
          lineas: lineas.map((l) => ({
            concepto: l.concepto,
            cantidad: l.cantidad,
            unidad: l.unidad,
            precio_unitario_eur: l.precio_unitario_eur,
          })),
        });
      } else if (cotizacionActiva) {
        await actualizarCotizacion(cotizacionActiva.id, {
          requisitos: form.requisitos,
          valida_hasta: form.valida_hasta,
          modalidad: form.modalidad,
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

  const agregarLinea = async () => {
    const errorLinea = validarLineaCotizacion(lineaForm);
    if (errorLinea) {
      setErrorForm(errorLinea);
      return;
    }
    setErrorForm(null);

    if (drawerModo === 'crear') {
      const cantidad = Number(lineaForm.cantidad);
      const precio = Number(lineaForm.precio_unitario_eur);
      const monto = importeDesdeCantidadYPrecio(cantidad, precio);
      setLineas((prev) => [
        ...prev,
        {
          id: Date.now() + prev.length,
          cotizacion_id: 0,
          concepto: lineaForm.concepto.trim(),
          cantidad,
          unidad: lineaForm.unidad,
          precio_unitario_eur: precio,
          monto_eur: monto,
        },
      ]);
      setForm((f) => ({
        ...f,
        precio_cotizado_eur: (f.precio_cotizado_eur ?? 0) + monto,
      }));
      setLineaForm(LINEA_FORM_VACIO);
      return;
    }

    if (!cotizacionActiva) return;
    try {
      const res = await crearLineaCotizacion(cotizacionActiva.id, {
        concepto: lineaForm.concepto.trim(),
        cantidad: Number(lineaForm.cantidad),
        unidad: lineaForm.unidad,
        precio_unitario_eur: Number(lineaForm.precio_unitario_eur),
      });
      setLineas((prev) => [...prev, res.linea]);
      setForm((f) => ({ ...f, precio_cotizado_eur: res.cotizacion.precio_cotizado_eur }));
      setCotizacionActiva((prev) =>
        prev
          ? {
              ...prev,
              precio_cotizado_eur: res.cotizacion.precio_cotizado_eur,
              estado: res.cotizacion.estado,
            }
          : prev,
      );
      setLineaForm(LINEA_FORM_VACIO);
      await cargarCotizaciones();
    } catch (e) {
      setErrorForm(e instanceof Error ? e.message : 'Error al agregar línea');
    }
  };

  const quitarLinea = async (lineaId: number) => {
    if (drawerModo === 'crear') {
      const linea = lineas.find((l) => l.id === lineaId);
      setLineas((prev) => prev.filter((l) => l.id !== lineaId));
      if (linea) {
        setForm((f) => ({
          ...f,
          precio_cotizado_eur: Math.max(0, (f.precio_cotizado_eur ?? 0) - linea.monto_eur),
        }));
      }
      return;
    }
    if (!cotizacionActiva) return;
    try {
      const res = await eliminarLineaCotizacion(cotizacionActiva.id, lineaId);
      setLineas((prev) => prev.filter((l) => l.id !== lineaId));
      setForm((f) => ({ ...f, precio_cotizado_eur: res.cotizacion.precio_cotizado_eur }));
      setCotizacionActiva((prev) =>
        prev
          ? {
              ...prev,
              precio_cotizado_eur: res.cotizacion.precio_cotizado_eur,
              estado: res.cotizacion.estado,
            }
          : prev,
      );
      await cargarCotizaciones();
    } catch (e) {
      setErrorForm(e instanceof Error ? e.message : 'Error al eliminar línea');
    }
  };

  const convertirAReserva = async () => {
    if (!cotizacionActiva) return;
    setErrorForm(null);
    try {
      if (cotizacionActiva.estado === 'pendiente') {
        const res = await aceptarCotizacion(cotizacionActiva.id);
        setCotizacionActiva((prev) =>
          prev ? { ...prev, estado: res.cotizacion.estado } : prev,
        );
        await cargarCotizaciones();
      }
      setConvertirAbierto(true);
    } catch (e) {
      setErrorForm(e instanceof Error ? e.message : 'Error al convertir cotización');
    }
  };

  const confirmarRechazar = (cot: Cotizacion) => {
    if (drawerAbierto) cerrarDrawer();
    setCotizacionARechazar(cot);
    setConfirmAbierto(true);
  };

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
      setError(e instanceof Error ? e.message : 'Error al rechazar cotización');
    } finally {
      setRechazando(false);
    }
  };

  const cancelarRechazar = () => {
    setConfirmAbierto(false);
    setCotizacionARechazar(null);
  };

  const imprimirPdf = useCallback(
    async (cot: Cotizacion) => {
      setImprimiendoPdf(true);
      try {
        let lineasDoc: CotizacionLinea[] = [];
        if (cotizacionActiva?.id === cot.id && !cargandoLineas) {
          lineasDoc = lineas;
        } else {
          try {
            lineasDoc = await obtenerLineasCotizacion(cot.id);
          } catch {
            lineasDoc = [];
          }
        }

        const mismaAbierta = cotizacionActiva?.id === cot.id;
        const cotParaPdf: Cotizacion = mismaAbierta
          ? {
              ...cot,
              requisitos: form.requisitos ?? cot.requisitos,
              precio_cotizado_eur: form.precio_cotizado_eur ?? cot.precio_cotizado_eur,
              valida_hasta: form.valida_hasta ?? cot.valida_hasta,
            }
          : cot;

        flushSync(() => {
          setPdfLineas(lineasDoc);
          setPdfCotizacion(cotParaPdf);
        });
        document.body.setAttribute('data-zona-imprimir', 'zona-imprimible-cotizacion');
        window.print();
        window.setTimeout(() => {
          document.body.removeAttribute('data-zona-imprimir');
        }, 0);
      } finally {
        setImprimiendoPdf(false);
      }
    },
    [cotizacionActiva, cargandoLineas, lineas, form],
  );

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
    pdfCotizacion,
    pdfLineas,
    imprimiendoPdf,
    drawerTab,
    lineas,
    lineaForm,
    cargandoLineas,
    clientesOpciones,
    cargandoClientes,
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
    convertirAReserva,
    confirmarRechazar,
    ejecutarRechazar,
    cancelarRechazar,
    imprimirPdf,
  };
}
