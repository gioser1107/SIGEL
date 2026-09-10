import { useCallback, useEffect, useMemo, useState } from 'react';
import { useVistaModuloResponsive } from '../../../../hooks/useVistaModuloResponsive';
import { usePaginacionListado } from '../../../../hooks/usePaginacionListado';
import {
  actualizarViaje,
  crearCosto,
  crearViaje,
  eliminarCosto,
  eliminarViaje,
  obtenerCostos,
  obtenerGuiasDisponibles,
  obtenerViajes,
} from '../../../../services/viajes';
import { listarDestinosParaSelect } from '../../../../services/destinos';
import { listarUnidadesParaSelect } from '../../../../services/unidades';
import type { Costo, DatosViajeNuevo, GuiaDisponible, Viaje } from '../../../../types/viaje';
import type { OpcionSelectBuscador } from '../../../../components/admin';
import type { FiltroListado } from '../../../../types/paginacion';
import { COSTO_VACIO, FORM_VACIO } from '../constants';
import {
  combinarOpcionesGuias,
  guiasDesdeViaje,
  payloadViajeConGuias,
} from '../utils/planificacionGuias';
import { validarFormularioViaje, validarLineaCosto } from '../../../../utils/validacionesFormulario';

export function usePlanificacion() {
  const [viajes, setViajes] = useState<Viaje[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<FiltroListado>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [vista, setVista] = useVistaModuloResponsive();

  const [drawerAbierto, setDrawerAbierto] = useState(false);
  const [drawerModo, setDrawerModo] = useState<'crear' | 'editar'>('crear');
  const [viajeActivo, setViajeActivo] = useState<Viaje | null>(null);
  const [tabActiva, setTabActiva] = useState('info');

  const [costos, setCostos] = useState<Costo[]>([]);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  const [form, setForm] = useState<DatosViajeNuevo>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  const [nuevoCosto, setNuevoCosto] = useState(COSTO_VACIO);
  const [guardandoCosto, setGuardandoCosto] = useState(false);

  const [confirmAbierto, setConfirmAbierto] = useState(false);
  const [viajeAEliminar, setViajeAEliminar] = useState<Viaje | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [guias, setGuias] = useState<GuiaDisponible[]>([]);
  const [cargandoGuias, setCargandoGuias] = useState(false);
  const [destinosOpciones, setDestinosOpciones] = useState<OpcionSelectBuscador[]>([]);
  const [cargandoDestinos, setCargandoDestinos] = useState(false);
  const [unidadesOpciones, setUnidadesOpciones] = useState<OpcionSelectBuscador[]>([]);
  const [cargandoUnidades, setCargandoUnidades] = useState(false);
  const { pagina, setTotal, total, totalPaginas, irPagina, reiniciarPagina, limite } = usePaginacionListado();

  const guiasOpciones = useMemo(
    () => combinarOpcionesGuias(guias, viajeActivo),
    [guias, viajeActivo],
  );

  const cargarGuias = useCallback(async () => {
    setCargandoGuias(true);
    try {
      setGuias(await obtenerGuiasDisponibles());
    } catch {
      setGuias([]);
    } finally {
      setCargandoGuias(false);
    }
  }, []);

  const cargarCatalogoFormulario = useCallback(async () => {
    setCargandoDestinos(true);
    setCargandoUnidades(true);
    try {
      const [destinos, unidades] = await Promise.all([
        listarDestinosParaSelect(),
        listarUnidadesParaSelect(),
      ]);
      setDestinosOpciones(
        destinos.map((d) => ({
          valor: d.id,
          etiqueta: d.nombre,
          busqueda: [d.nombre, d.descripcion ?? ''].join(' ').trim(),
        })),
      );
      setUnidadesOpciones(
        unidades.map((u) => {
          const modelo = u.modelo?.trim();
          const detalle = modelo ? `${modelo} · ${u.capacidad} pax` : `${u.capacidad} pax`;
          return {
            valor: u.id,
            etiqueta: `${u.placa} — ${detalle}`,
            busqueda: [u.placa, modelo ?? '', String(u.capacidad)].join(' ').trim(),
            titulo: `${u.placa}${modelo ? ` (${modelo})` : ''} — ${u.capacidad} asientos`,
          };
        }),
      );
    } catch {
      setDestinosOpciones([]);
      setUnidadesOpciones([]);
    } finally {
      setCargandoDestinos(false);
      setCargandoUnidades(false);
    }
  }, []);

  useEffect(() => {
    if (drawerAbierto && drawerModo === 'crear') {
      cargarCatalogoFormulario();
    }
  }, [drawerAbierto, drawerModo, cargarCatalogoFormulario]);

  useEffect(() => {
    if (drawerAbierto) cargarGuias();
  }, [drawerAbierto, cargarGuias]);

  const cargarViajes = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const params = {
        ...(filtroEstado === 'anulado'
          ? { filtro: 'anulado' as const }
          : filtroEstado !== 'todos'
            ? { filtro: filtroEstado }
            : {}),
        pagina,
        limite,
      };
      const respuesta = await obtenerViajes(params);
      setViajes(respuesta.items);
      setTotal(respuesta.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar viajes');
    } finally {
      setCargando(false);
    }
  }, [filtroEstado, pagina, limite, setTotal]);

  useEffect(() => {
    cargarViajes();
  }, [cargarViajes]);

  const cargarDetalle = async (id: number) => {
    setCargandoDetalle(true);
    try {
      setCostos(await obtenerCostos(id));
    } catch {
      // detalle no crítico
    } finally {
      setCargandoDetalle(false);
    }
  };

  const abrirCrear = () => {
    setDrawerModo('crear');
    setViajeActivo(null);
    setForm(FORM_VACIO);
    setCostos([]);
    setTabActiva('info');
    setErrorForm(null);
    setDrawerAbierto(true);
  };

  const abrirEditar = (viaje: Viaje) => {
    const { guias_ids, guia_principal_id } = guiasDesdeViaje(viaje);
    setDrawerModo('editar');
    setViajeActivo(viaje);
    setForm({
      destino_id: viaje.destino_id,
      unidad_id: viaje.unidad_id,
      guias_ids,
      guia_principal_id,
      fecha_salida: viaje.fecha_salida,
      fecha_regreso: viaje.fecha_regreso ?? null,
      estado: viaje.estado,
    });
    setTabActiva('info');
    setErrorForm(null);
    setDrawerAbierto(true);
    cargarDetalle(viaje.id);
  };

  const cerrarDrawer = () => {
    setDrawerAbierto(false);
    setViajeActivo(null);
    setErrorForm(null);
  };

  const guardarInfo = async () => {
    const errorValidacion = validarFormularioViaje(form);
    if (errorValidacion) {
      setErrorForm(errorValidacion);
      return;
    }
    const { payload, error: errorGuias } = payloadViajeConGuias(form);
    if (errorGuias) {
      setErrorForm(errorGuias);
      return;
    }
    setGuardando(true);
    setErrorForm(null);
    try {
      if (drawerModo === 'crear') {
        await crearViaje({ ...payload, estado: 'planificado' });
      } else if (viajeActivo) {
        await actualizarViaje(viajeActivo.id, payload);
      }
      await cargarViajes();
      if (drawerModo === 'crear') cerrarDrawer();
    } catch (e) {
      setErrorForm(e instanceof Error ? e.message : 'Error al guardar viaje');
    } finally {
      setGuardando(false);
    }
  };

  const agregarCosto = async () => {
    if (!viajeActivo) return;
    const errorCosto = validarLineaCosto(nuevoCosto);
    if (errorCosto) {
      alert(errorCosto);
      return;
    }
    setGuardandoCosto(true);
    try {
      await crearCosto(viajeActivo.id, {
        categoria: nuevoCosto.categoria,
        monto_eur: Number(nuevoCosto.monto_eur),
        descripcion: nuevoCosto.descripcion || null,
      });
      await cargarDetalle(viajeActivo.id);
      setNuevoCosto(COSTO_VACIO);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al agregar costo');
    } finally {
      setGuardandoCosto(false);
    }
  };

  const eliminarCostoFn = async (costoId: number) => {
    if (!viajeActivo) return;
    try {
      await eliminarCosto(viajeActivo.id, costoId);
      await cargarDetalle(viajeActivo.id);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al eliminar costo');
    }
  };

  const confirmarEliminar = (viaje: Viaje) => {
    if (drawerAbierto) cerrarDrawer();
    setViajeAEliminar(viaje);
    setConfirmAbierto(true);
  };

  const ejecutarEliminar = async () => {
    if (!viajeAEliminar) return;
    setEliminando(true);
    try {
      await eliminarViaje(viajeAEliminar.id);
      setConfirmAbierto(false);
      setViajeAEliminar(null);
      setFiltroEstado('anulado');
      reiniciarPagina();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al anular viaje');
    } finally {
      setEliminando(false);
    }
  };

  const cancelarEliminar = () => {
    setConfirmAbierto(false);
    setViajeAEliminar(null);
  };

  const viajesFiltrados = viajes.filter((v) => {
    const texto = busqueda.toLowerCase();
    const coincideGuia =
      (v.guia_nombre ?? '').toLowerCase().includes(texto) ||
      (v.guias ?? []).some((g) => g.nombre.toLowerCase().includes(texto));
    return (
      !texto ||
      (v.destino_nombre ?? '').toLowerCase().includes(texto) ||
      (v.unidad_placa ?? '').toLowerCase().includes(texto) ||
      coincideGuia
    );
  });

  const totalEur = costos.reduce((s, c) => s + c.monto_eur, 0);

  return {
    viajes,
    viajesFiltrados,
    cargando,
    error,
    filtroEstado,
    busqueda,
    vista,
    drawerAbierto,
    drawerModo,
    viajeActivo,
    tabActiva,
    costos,
    cargandoDetalle,
    form,
    guardando,
    errorForm,
    nuevoCosto,
    guardandoCosto,
    confirmAbierto,
    viajeAEliminar,
    eliminando,
    destinosOpciones,
    unidadesOpciones,
    guiasOpciones,
    cargandoGuias,
    cargandoDestinos,
    cargandoUnidades,
    totalEur,
    pagina,
    total,
    totalPaginas,
    irPagina,
    reiniciarPagina,
    limite,
    setFiltroEstado,
    setBusqueda,
    setVista,
    setForm,
    setTabActiva,
    setNuevoCosto,
    abrirCrear,
    abrirEditar,
    cerrarDrawer,
    guardarInfo,
    agregarCosto,
    eliminarCostoFn,
    confirmarEliminar,
    ejecutarEliminar,
    cancelarEliminar,
  };
}
