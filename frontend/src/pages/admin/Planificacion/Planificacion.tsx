import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlternadorVista,
  BotonAccionTabla,
  CabeceraModulo,
  PestaniasFiltro,
  TablaDatos,
  PaginacionTabla,
} from '../../../components/admin';
import type { PestaniaFiltro } from '../../../components/admin';
import Boton from '../../../components/ui/Boton/Boton';
import BtnImprimirReporte from '../../../components/ui/BtnImprimirReporte/BtnImprimirReporte';
import CabeceraReporteImpresion from '../../../components/ui/CabeceraReporteImpresion/CabeceraReporteImpresion';
import TablaReporteImpresion from '../../../components/ui/TablaReporteImpresion/TablaReporteImpresion';
import type { Viaje } from '../../../types/viaje';
import type { FiltroListado } from '../../../types/paginacion';
import ModalAnularViaje from './AnularViaje/ModalAnularViaje';
import PanelEditarViaje from './EditarViaje/PanelEditarViaje';
import PanelNuevoViaje from './NuevoViaje/PanelNuevoViaje';
import { columnasViajes } from './components/columnasViajes';
import VistaTarjetasPlanificacion from './components/VistaTarjetasPlanificacion';
import { ETIQUETA_ESTADO, PESTANIAS_FILTRO } from './constants';
import { etiquetaGuiasViaje } from './utils/planificacionGuias';
import { usePlanificacion } from './hooks/usePlanificacion';
import { SIN_DATO, textoVisible } from '../../../utils/etiquetasNegocio';
import { formatFecha } from './utils/formatearViaje';
import './Planificacion.css';

const COLUMNAS_REPORTE_PLANIFICACION = [
  { encabezado: 'Destino', clave: 'destino' },
  { encabezado: 'Fecha salida', clave: 'fecha' },
  { encabezado: 'Unidad', clave: 'unidad' },
  { encabezado: 'Estado', clave: 'estado' },
  { encabezado: 'Guía', clave: 'guia' },
] as const;

function rutaReporteOperativo(viajeId: number): string {
  return `/admin/reporte-viaje?viaje=${viajeId}`;
}

function filasListadoImpresion(viajes: Viaje[]) {
  return viajes.map((v) => ({
    destino: textoVisible(v.destino_nombre, SIN_DATO.destino),
    fecha: formatFecha(v.fecha_salida),
    unidad: textoVisible(v.unidad_placa, SIN_DATO.unidad),
    estado: ETIQUETA_ESTADO[v.estado] ?? v.estado,
    guia: etiquetaGuiasViaje(v),
  }));
}

export default function Planificacion() {
  const navegar = useNavigate();
  const {
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
  } = usePlanificacion();

  const [idsSeleccionados, setIdsSeleccionados] = useState<Set<string | number>>(new Set());
  const esTabAnulados = filtroEstado === 'anulado';

  useEffect(() => {
    setIdsSeleccionados(new Set());
  }, [filtroEstado, pagina, busqueda]);

  const columnas = useMemo(() => columnasViajes(), []);

  const pestaniasConContador: PestaniaFiltro[] = PESTANIAS_FILTRO.map((t) => ({
    ...t,
    contador: t.id === filtroEstado ? total : undefined,
  }));

  const etiquetaFiltroActivo =
    PESTANIAS_FILTRO.find((p) => p.id === filtroEstado)?.etiqueta ?? 'Todos';

  const haySeleccion = idsSeleccionados.size > 0;
  const viajesReporte = useMemo(
    () =>
      haySeleccion
        ? viajesFiltrados.filter((v) => idsSeleccionados.has(v.id))
        : viajesFiltrados,
    [haySeleccion, idsSeleccionados, viajesFiltrados],
  );
  const idSeleccionadoUnico =
    idsSeleccionados.size === 1 ? Number([...idsSeleccionados][0]) : null;

  const resumenReporte = useMemo(
    () => [
      { etiqueta: 'Registros', valor: viajesReporte.length },
      {
        etiqueta: 'Planificados',
        valor: viajesReporte.filter((v) => v.estado === 'planificado').length,
      },
      {
        etiqueta: 'En curso',
        valor: viajesReporte.filter((v) => v.estado === 'en_curso').length,
      },
      {
        etiqueta: 'Finalizados',
        valor: viajesReporte.filter((v) => v.estado === 'finalizado').length,
      },
    ],
    [viajesReporte],
  );

  const filasReporte = useMemo(
    () => filasListadoImpresion(viajesReporte),
    [viajesReporte],
  );

  function abrirReporteOperativo(viajeId: number) {
    navegar(rutaReporteOperativo(viajeId));
  }

  const etiquetaImprimir = haySeleccion
    ? `Imprimir listado (${idsSeleccionados.size})`
    : 'Imprimir listado';

  return (
    <div className="planificacion">
      <div className="no-imprimir">
        <CabeceraModulo
          migaja="TravelBqto / Admin"
          titulo="Planificación de viajes"
          contador={total}
          descripcion="Marca viajes para imprimir solo esos en el listado. El reporte operativo (pasajeros, asientos y cobros) se abre con el icono de impresora."
          acciones={
            <>
              <BtnImprimirReporte
                etiqueta={etiquetaImprimir}
                deshabilitado={cargando || viajesReporte.length === 0}
              />
              <Boton variante="primario" tamano="sm" onClick={abrirCrear}>
                + Nuevo viaje
              </Boton>
            </>
          }
        />
      </div>

      <div className="zona-imprimible">
        <CabeceraReporteImpresion
          titulo="Listado de planificación de viajes"
          subtitulo="Salidas programadas, unidades asignadas y estado operativo."
          filtroActivo={
            haySeleccion
              ? `${etiquetaFiltroActivo} · ${idsSeleccionados.size} seleccionado(s)`
              : etiquetaFiltroActivo
          }
          resumen={resumenReporte}
        >
          <TablaReporteImpresion
            columnas={[...COLUMNAS_REPORTE_PLANIFICACION]}
            filas={filasReporte}
            mensajeVacio="No hay viajes que coincidan con el filtro activo."
          />
        </CabeceraReporteImpresion>

        <div className="no-imprimir">
      <PestaniasFiltro
        pestanias={pestaniasConContador}
        activa={filtroEstado}
        onChange={(id) => { setFiltroEstado(id as FiltroListado); reiniciarPagina(); }}
      />

      <div className="planificacion__toolbar">
        <div className="planificacion__toolbar-izq">
          <AlternadorVista vista={vista} onChange={setVista} />
          <div className="planificacion__busqueda">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Buscar destino o placa..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              aria-label="Buscar viajes"
            />
          </div>
        </div>
        {haySeleccion && (
          <div className="planificacion__acciones-lote">
            <span className="planificacion__seleccion-info">
              {idsSeleccionados.size === 1
                ? '1 viaje seleccionado'
                : `${idsSeleccionados.size} viajes seleccionados`}
            </span>
            {idSeleccionadoUnico != null && (
              <Boton
                variante="primario"
                tamano="sm"
                onClick={() => abrirReporteOperativo(idSeleccionadoUnico)}
              >
                Ver reporte operativo
              </Boton>
            )}
            <Boton
              variante="secundario"
              tamano="sm"
              onClick={() => setIdsSeleccionados(new Set())}
            >
              Quitar selección
            </Boton>
          </div>
        )}
      </div>

      {error && (
        <div className="planificacion__error" role="alert">
          {error}
        </div>
      )}

      {vista === 'tabla' && (
        <TablaDatos
          columnas={columnas}
          datos={viajesFiltrados}
          cargando={cargando}
          mensajeVacio={esTabAnulados ? 'No hay viajes anulados.' : 'No hay viajes registrados.'}
          accionesVacio={
            esTabAnulados ? undefined : (
              <Boton variante="primario" tamano="sm" onClick={abrirCrear}>
                + Nuevo viaje
              </Boton>
            )
          }
          idFila={(v) => v.id}
          seleccionMultiple
          filasSeleccionadas={idsSeleccionados}
          onSeleccionChange={setIdsSeleccionados}
          onFilaClick={esTabAnulados ? undefined : abrirEditar}
          accionesFila={(viaje: Viaje) => (
            <>
              <BotonAccionTabla
                accion="imprimir"
                titulo="Reporte operativo"
                ariaLabel={`Reporte operativo de ${viaje.destino_nombre ?? 'viaje'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  abrirReporteOperativo(viaje.id);
                }}
              />
              {!esTabAnulados && (
                <>
                  <BotonAccionTabla
                    accion="editar"
                    onClick={() => abrirEditar(viaje)}
                    ariaLabel={`Editar ${viaje.destino_nombre ?? 'viaje'}`}
                  />
                  <BotonAccionTabla
                    accion="anular"
                    onClick={() => confirmarEliminar(viaje)}
                    ariaLabel={`Anular ${viaje.destino_nombre ?? 'viaje'}`}
                  />
                </>
              )}
            </>
          )}
        />
      )}

      {vista === 'tabla' && (
        <PaginacionTabla
          pagina={pagina}
          totalPaginas={totalPaginas}
          total={total}
          limite={limite}
          onPaginaChange={irPagina}
        />
      )}

      {vista === 'tarjetas' && (
        <VistaTarjetasPlanificacion
          datos={viajesFiltrados}
          cargando={cargando}
          soloLectura={esTabAnulados}
          onEditar={abrirEditar}
          onAnular={confirmarEliminar}
          onVerReporte={(viaje) => abrirReporteOperativo(viaje.id)}
        />
      )}
        </div>
      </div>

      <PanelNuevoViaje
        abierto={drawerAbierto && drawerModo === 'crear'}
        form={form}
        guardando={guardando}
        errorForm={errorForm}
        destinosOpciones={destinosOpciones}
        unidadesOpciones={unidadesOpciones}
        guiasOpciones={guiasOpciones}
        cargandoGuias={cargandoGuias}
        cargandoDestinos={cargandoDestinos}
        cargandoUnidades={cargandoUnidades}
        onCerrar={cerrarDrawer}
        onGuardar={guardarInfo}
        onFormChange={setForm}
      />

      <PanelEditarViaje
        abierto={drawerAbierto && drawerModo === 'editar'}
        viaje={viajeActivo}
        form={form}
        guardando={guardando}
        errorForm={errorForm}
        tabActiva={tabActiva}
        costos={costos}
        cargandoDetalle={cargandoDetalle}
        totalEur={totalEur}
        nuevoCosto={nuevoCosto}
        guardandoCosto={guardandoCosto}
        guiasOpciones={guiasOpciones}
        cargandoGuias={cargandoGuias}
        onCerrar={cerrarDrawer}
        onGuardar={guardarInfo}
        onTabChange={setTabActiva}
        onFormChange={setForm}
        onNuevoCostoChange={setNuevoCosto}
        onAgregarCosto={agregarCosto}
        onEliminarCosto={eliminarCostoFn}
      />

      <ModalAnularViaje
        abierto={confirmAbierto}
        viaje={viajeAEliminar}
        cargando={eliminando}
        onConfirmar={ejecutarEliminar}
        onCancelar={cancelarEliminar}
      />
    </div>
  );
}
