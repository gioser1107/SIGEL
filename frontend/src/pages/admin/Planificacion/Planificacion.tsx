import { useMemo } from 'react';
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
import { formatFecha } from './utils/formatearViaje';
import './Planificacion.css';

const COLUMNAS_REPORTE_PLANIFICACION = [
  { encabezado: 'Destino', clave: 'destino' },
  { encabezado: 'Fecha salida', clave: 'fecha' },
  { encabezado: 'Unidad', clave: 'unidad' },
  { encabezado: 'Estado', clave: 'estado' },
  { encabezado: 'Guía', clave: 'guia' },
] as const;

export default function Planificacion() {
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

  const esTabAnulados = filtroEstado === 'anulado';

  const columnas = useMemo(() => columnasViajes(), []);

  const pestaniasConContador: PestaniaFiltro[] = PESTANIAS_FILTRO.map((t) => ({
    ...t,
    contador: t.id === filtroEstado ? total : undefined,
  }));

  const etiquetaFiltroActivo =
    PESTANIAS_FILTRO.find((p) => p.id === filtroEstado)?.etiqueta ?? 'Todos';

  const resumenReporte = useMemo(
    () => [
      { etiqueta: 'Registros', valor: viajesFiltrados.length },
      {
        etiqueta: 'Planificados',
        valor: viajesFiltrados.filter((v) => v.estado === 'planificado').length,
      },
      {
        etiqueta: 'En curso',
        valor: viajesFiltrados.filter((v) => v.estado === 'en_curso').length,
      },
      {
        etiqueta: 'Finalizados',
        valor: viajesFiltrados.filter((v) => v.estado === 'finalizado').length,
      },
    ],
    [viajesFiltrados],
  );

  const filasReporte = useMemo(
    () =>
      viajesFiltrados.map((v) => ({
        destino: v.destino_nombre ?? `Destino #${v.destino_id}`,
        fecha: formatFecha(v.fecha_salida),
        unidad: v.unidad_placa ?? `Unidad #${v.unidad_id}`,
        estado: ETIQUETA_ESTADO[v.estado] ?? v.estado,
        guia: etiquetaGuiasViaje(v),
      })),
    [viajesFiltrados],
  );

  return (
    <div className="planificacion">
      <div className="no-imprimir">
        <CabeceraModulo
          migaja="TravelBqto / Admin"
          titulo="Planificación de viajes"
          contador={total}
          acciones={
            <>
              <BtnImprimirReporte deshabilitado={cargando || viajesFiltrados.length === 0} />
              <Boton variante="primario" tamano="sm" onClick={abrirCrear}>
                + Nuevo viaje
              </Boton>
            </>
          }
        />
      </div>

      <div className="zona-imprimible">
        <CabeceraReporteImpresion
          titulo="Reporte de planificación de viajes"
          subtitulo="Salidas programadas, unidades asignadas y estado operativo."
          filtroActivo={etiquetaFiltroActivo}
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
          filasSeleccionadas={new Set<number>()}
          onSeleccionChange={() => {}}
          onFilaClick={esTabAnulados ? undefined : abrirEditar}
          accionesFila={
            esTabAnulados
              ? undefined
              : (viaje: Viaje) => (
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
