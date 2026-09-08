import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useVistaModuloResponsive } from '../../../../hooks/useVistaModuloResponsive';
import { usePaginacionListado } from '../../../../hooks/usePaginacionListado';
import {
  actualizarDestino,
  anularDestino,
  crearDestino,
  actualizarImagenDestino,
  obtenerDestinoPorId,
  obtenerDestinos,
  quitarImagenDestino,
  subirImagenDestino,
} from '../../../../services/destinos';
import type { DatosDestinoNuevo, Destino, DestinoImagen } from '../../../../types/destino';
import type { FiltroListado } from '../../../../types/paginacion';
import { FORM_VACIO } from '../constants';
import { filtrarPorBusqueda } from '../utils/formatearDestino';
import { validarFormularioDestino } from '../../../../utils/validacionesFormulario';

export function useDestinos() {
  const [destinos, setDestinos] = useState<Destino[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroTab, setFiltroTab] = useState<FiltroListado>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [vista, setVista] = useVistaModuloResponsive();

  const [drawerAbierto, setDrawerAbierto] = useState(false);
  const [drawerModo, setDrawerModo] = useState<'crear' | 'editar'>('crear');
  const [destinoActivo, setDestinoActivo] = useState<Destino | null>(null);

  const [form, setForm] = useState<DatosDestinoNuevo>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  const [confirmAbierto, setConfirmAbierto] = useState(false);
  const [destinoAAnular, setDestinoAAnular] = useState<Destino | null>(null);
  const [anulando, setAnulando] = useState(false);
  const [errorAnular, setErrorAnular] = useState<string | null>(null);

  const [imagenes, setImagenes] = useState<DestinoImagen[]>([]);
  const [archivoNuevo, setArchivoNuevo] = useState<File | null>(null);
  const [archivoPortada, setArchivoPortada] = useState<File | null>(null);
  const [cargandoImagenes, setCargandoImagenes] = useState(false);
  const [errorImagenes, setErrorImagenes] = useState<string | null>(null);
  const cargaImagenesSeq = useRef(0);
  const { pagina, setTotal, total, totalPaginas, irPagina, reiniciarPagina, limite } = usePaginacionListado();

  const cargarDestinos = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const respuesta = await obtenerDestinos({ pagina, limite, filtro: filtroTab });
      setDestinos(respuesta.items);
      setTotal(respuesta.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar destinos');
    } finally {
      setCargando(false);
    }
  }, [pagina, limite, filtroTab, setTotal]);

  useEffect(() => {
    cargarDestinos();
  }, [cargarDestinos]);

  const destinosFiltrados = useMemo(
    () => filtrarPorBusqueda(destinos, busqueda),
    [destinos, busqueda],
  );

  const cargarImagenesDestino = async (destinoId: number) => {
    const seq = ++cargaImagenesSeq.current;
    setCargandoImagenes(true);
    setErrorImagenes(null);
    try {
      const detalle = await obtenerDestinoPorId(destinoId);
      if (seq !== cargaImagenesSeq.current) return;
      setDestinoActivo(detalle);
      setImagenes(detalle.imagenes ?? []);
    } catch (e) {
      if (seq !== cargaImagenesSeq.current) return;
      setErrorImagenes(e instanceof Error ? e.message : 'Error al cargar imágenes');
      setImagenes([]);
    } finally {
      if (seq === cargaImagenesSeq.current) {
        setCargandoImagenes(false);
      }
    }
  };

  const abrirCrear = () => {
    setDrawerModo('crear');
    setDestinoActivo(null);
    setForm(FORM_VACIO);
    setImagenes([]);
    setArchivoNuevo(null);
    setArchivoPortada(null);
    setErrorImagenes(null);
    setErrorForm(null);
    setDrawerAbierto(true);
  };

  const abrirEditar = (destino: Destino) => {
    setDrawerModo('editar');
    setDestinoActivo(destino);
    setForm({
      nombre: destino.nombre,
      descripcion: destino.descripcion ?? '',
      precio_base_eur: destino.precio_base_eur,
      dificultad: destino.dificultad ?? 'Moderado',
      activo: destino.activo,
    });
    setArchivoNuevo(null);
    setArchivoPortada(null);
    setImagenes(destino.imagenes ?? []);
    setErrorImagenes(null);
    setErrorForm(null);
    setDrawerAbierto(true);
    cargarImagenesDestino(destino.id);
  };

  const cerrarDrawer = () => {
    setDrawerAbierto(false);
    setDestinoActivo(null);
    setImagenes([]);
    setArchivoNuevo(null);
    setArchivoPortada(null);
    setErrorImagenes(null);
    setErrorForm(null);
  };

  const guardar = async () => {
    const errorValidacion = validarFormularioDestino(form);
    if (errorValidacion) {
      setErrorForm(errorValidacion);
      return;
    }

    setGuardando(true);
    setErrorForm(null);
    try {
      const datosBase: DatosDestinoNuevo = {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion?.trim() || null,
        precio_base_eur: form.precio_base_eur,
        dificultad: form.dificultad,
        activo: form.activo,
      };

      if (drawerModo === 'crear') {
        const respuesta = await crearDestino(datosBase);
        if (archivoPortada) {
          await subirImagenDestino(respuesta.destino.id, archivoPortada, true);
        }
      } else if (destinoActivo) {
        await actualizarDestino(destinoActivo.id, datosBase);
        if (archivoNuevo) {
          await subirImagenDestino(destinoActivo.id, archivoNuevo, imagenes.length === 0);
        }
      }

      await cargarDestinos();
      cerrarDrawer();
    } catch (e) {
      setErrorForm(e instanceof Error ? e.message : 'Error al guardar destino');
    } finally {
      setGuardando(false);
    }
  };

  const confirmarAnular = (destino: Destino) => {
    if (drawerAbierto) {
      cerrarDrawer();
    }
    setErrorAnular(null);
    setDestinoAAnular(destino);
    setConfirmAbierto(true);
  };

  const ejecutarAnular = async () => {
    if (!destinoAAnular) return;
    setAnulando(true);
    setErrorAnular(null);
    try {
      await anularDestino(destinoAAnular.id);
      setConfirmAbierto(false);
      setDestinoAAnular(null);
      setFiltroTab('anulado');
      reiniciarPagina();
    } catch (e) {
      setErrorAnular(e instanceof Error ? e.message : 'Error al anular destino');
    } finally {
      setAnulando(false);
    }
  };

  const cancelarAnular = () => {
    setConfirmAbierto(false);
    setDestinoAAnular(null);
    setErrorAnular(null);
  };

  const subirImagen = async (archivo?: File | null) => {
    const archivoASubir = archivo ?? archivoNuevo;
    if (!destinoActivo || !archivoASubir) return;
    setCargandoImagenes(true);
    setErrorImagenes(null);
    try {
      await subirImagenDestino(destinoActivo.id, archivoASubir, imagenes.length === 0);
      setArchivoNuevo(null);
      await cargarImagenesDestino(destinoActivo.id);
      await cargarDestinos();
    } catch (e) {
      setErrorImagenes(e instanceof Error ? e.message : 'Error al subir imagen');
    } finally {
      setCargandoImagenes(false);
    }
  };

  const marcarPortada = async (imagenId: number) => {
    if (!destinoActivo) return;
    setCargandoImagenes(true);
    setErrorImagenes(null);
    try {
      await actualizarImagenDestino(destinoActivo.id, imagenId, { es_portada: true });
      await cargarImagenesDestino(destinoActivo.id);
      await cargarDestinos();
    } catch (e) {
      setErrorImagenes(e instanceof Error ? e.message : 'Error al actualizar portada');
    } finally {
      setCargandoImagenes(false);
    }
  };

  const quitarImagen = async (imagenId: number) => {
    if (!destinoActivo) return;
    setCargandoImagenes(true);
    setErrorImagenes(null);
    try {
      await quitarImagenDestino(destinoActivo.id, imagenId);
      await cargarImagenesDestino(destinoActivo.id);
      await cargarDestinos();
    } catch (e) {
      setErrorImagenes(e instanceof Error ? e.message : 'Error al quitar imagen');
    } finally {
      setCargandoImagenes(false);
    }
  };

  return {
    destinos,
    destinosFiltrados,
    cargando,
    error,
    filtroTab,
    busqueda,
    vista,
    drawerAbierto,
    drawerModo,
    destinoActivo,
    form,
    guardando,
    errorForm,
    confirmAbierto,
    destinoAAnular,
    anulando,
    errorAnular,
    imagenes,
    archivoNuevo,
    archivoPortada,
    cargandoImagenes,
    errorImagenes,
    setArchivoNuevo,
    setArchivoPortada,
    subirImagen,
    marcarPortada,
    quitarImagen,
    setFiltroTab,
    setBusqueda,
    setVista,
    setForm,
    pagina,
    total,
    totalPaginas,
    irPagina,
    reiniciarPagina,
    limite,
    abrirCrear,
    abrirEditar,
    cerrarDrawer,
    guardar,
    confirmarAnular,
    ejecutarAnular,
    cancelarAnular,
  };
}
