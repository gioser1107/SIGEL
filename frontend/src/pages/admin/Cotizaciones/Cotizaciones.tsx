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
import ModalConvertirReserva from './ConvertirReserva/ModalConvertirReserva';
import PanelEditarCotizacion from './EditarCotizacion/PanelEditarCotizacion';
import PanelNuevaCotizacion from './NuevaCotizacion/PanelNuevaCotizacion';
import ModalRechazarCotizacion from './RechazarCotizacion/ModalRechazarCotizacion';
import { columnasCotizaciones } from './components/columnasCotizaciones';
import DocumentoCotizacion from './components/DocumentoCotizacion';
import VistaTarjetasCotizaciones from './components/VistaTarjetasCotizaciones';
import type { FiltroListado } from '../../../types/paginacion';
import { ETIQUETA_ESTADO, PESTANIAS_FILTRO } from './constants';
import { useCotizaciones } from './hooks/useCotizaciones';
import { etiquetaCliente, formatFecha } from './utils/formatearCotizacion';
import './Cotizaciones.css';

const COLUMNAS_REPORTE_COTIZACIONES = [
  { encabezado: 'Cliente', clave: 'cliente' },
  { encabezado: 'Destino', clave: 'destino' },
  { encabezado: 'Precio', clave: 'precio' },
  { encabezado: 'Estado', clave: 'estado' },
  { encabezado: 'Válida hasta', clave: 'valida_hasta' },
] as const;

export default function Cotizaciones() {
  const {
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
    cambiarEstado,
    confirmarRechazar,
    ejecutarRechazar,
    cancelarRechazar,
    imprimirPdf,
    pdfCotizacion,
    pdfLineas,
    imprimiendoPdf,
  } = useCotizaciones();

  const esTabAnuladas = filtroTab === 'anulado';

  const columnas = useMemo(() => columnasCotizaciones(), []);

  const pestaniasConContador: PestaniaFiltro[] = PESTANIAS_FILTRO.map((t) => ({
    ...t,
    contador: t.id === filtroTab ? total : undefined,
  }));

  const etiquetaFiltroActivo =
    PESTANIAS_FILTRO.find((p) => p.id === filtroTab)?.etiqueta ?? 'Todas';

  const montoTotalEur = useMemo(
    () =>
      cotizacionesFiltradas.reduce((suma, c) => suma + (c.precio_cotizado_eur ?? 0), 0),
    [cotizacionesFiltradas],
  );

  const resumenReporte = useMemo(
    () => [
      { etiqueta: 'Registros', valor: cotizacionesFiltradas.length },
      {
        etiqueta: 'Pendientes',
        valor: cotizacionesFiltradas.filter(
          (c) => c.estado === 'solicitada' || c.estado === 'pendiente',
        ).length,
      },
      {
        etiqueta: 'Aceptadas',
        valor: cotizacionesFiltradas.filter((c) => c.estado === 'aceptada').length,
      },
      {
        etiqueta: 'Monto total',
        valor: `€ ${montoTotalEur.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`,
      },
    ],
    [cotizacionesFiltradas, montoTotalEur],
  );

  const filasReporte = useMemo(
    () =>
      cotizacionesFiltradas.map((c) => ({
        cliente: etiquetaCliente(c),
        destino: c.destino_nombre ?? `Destino #${c.destino_id}`,
        precio:
          c.precio_cotizado_eur !== null
            ? `€ ${c.precio_cotizado_eur.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`
            : 'Sin cotizar',
        estado: ETIQUETA_ESTADO[c.estado] ?? c.estado,
        valida_hasta: c.valida_hasta ? formatFecha(c.valida_hasta) : '—',
      })),
    [cotizacionesFiltradas],
  );

  return (
    <div className="cotizaciones">
      <div className="no-imprimir">
        <CabeceraModulo
          migaja="TravelBqto / Admin"
          titulo="Cotizaciones"
          contador={total}
          acciones={
            <>
              <BtnImprimirReporte deshabilitado={cargando || cotizacionesFiltradas.length === 0} />
              <Boton variante="primario" tamano="sm" onClick={abrirCrear}>
                + Nueva cotización
              </Boton>
            </>
          }
        />
      </div>

      <div className="zona-imprimible">
        <CabeceraReporteImpresion
          titulo="Reporte de cotizaciones comerciales"
          subtitulo="Ingresos potenciales, estados de presupuesto y clientes activos."
          filtroActivo={etiquetaFiltroActivo}
          resumen={resumenReporte}
        >
          <TablaReporteImpresion
            columnas={[...COLUMNAS_REPORTE_COTIZACIONES]}
            filas={filasReporte}
            mensajeVacio="No hay cotizaciones que coincidan con el filtro activo."
          />
        </CabeceraReporteImpresion>

        <div className="no-imprimir">
      <PestaniasFiltro
        pestanias={pestaniasConContador}
        activa={filtroTab}
        onChange={(id) => { setFiltroTab(id as FiltroListado); reiniciarPagina(); }}
      />

      <div className="cotizaciones__toolbar">
        <div className="cotizaciones__toolbar-izq">
          <AlternadorVista vista={vista} onChange={setVista} />
          <div className="cotizaciones__busqueda">
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
              placeholder="Buscar cliente o destino..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              aria-label="Buscar cotizaciones"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="cotizaciones__error" role="alert">
          {error}
        </div>
      )}

      {vista === 'tabla' && (
        <TablaDatos
          columnas={columnas}
          datos={cotizacionesFiltradas}
          cargando={cargando}
          mensajeVacio={esTabAnuladas ? 'No hay cotizaciones anuladas.' : 'No hay cotizaciones en este filtro.'}
          accionesVacio={
            esTabAnuladas ? undefined : (
              <Boton variante="primario" tamano="sm" onClick={abrirCrear}>
                + Nueva cotización
              </Boton>
            )
          }
          idFila={(c) => c.id}
          onFilaClick={esTabAnuladas ? undefined : abrirEditar}
          accionesFila={(c) => (
            <BotonAccionTabla
              accion="imprimir"
              onClick={() => imprimirPdf(c)}
              disabled={imprimiendoPdf}
              ariaLabel={`Imprimir cotización de ${c.cliente_nombre ?? `cliente #${c.cliente_id}`}`}
            />
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
        <VistaTarjetasCotizaciones
          datos={cotizacionesFiltradas}
          cargando={cargando}
          soloLectura={esTabAnuladas}
          onEditar={abrirEditar}
          onRechazar={confirmarRechazar}
          onImprimir={imprimirPdf}
          imprimiendo={imprimiendoPdf}
        />
      )}
        </div>
      </div>

      <PanelNuevaCotizacion
        abierto={drawerAbierto && drawerModo === 'crear'}
        form={form}
        guardando={guardando}
        errorForm={errorForm}
        clientesOpciones={clientesOpciones}
        cargandoClientes={cargandoClientes}
        destinosOpciones={destinosOpciones}
        cargandoDestinos={cargandoDestinos}
        onCerrar={cerrarDrawer}
        onGuardar={guardar}
        onFormChange={setForm}
      />

      <PanelEditarCotizacion
        abierto={drawerAbierto && drawerModo === 'editar'}
        cotizacion={cotizacionActiva}
        form={form}
        guardando={guardando}
        errorForm={errorForm}
        drawerTab={drawerTab}
        lineas={lineas}
        lineaForm={lineaForm}
        cargandoLineas={cargandoLineas}
        onCerrar={cerrarDrawer}
        onGuardar={guardar}
        onTabChange={setDrawerTab}
        onFormChange={setForm}
        onLineaFormChange={setLineaForm}
        onAgregarLinea={agregarLinea}
        onQuitarLinea={quitarLinea}
        onCambiarEstado={cambiarEstado}
        onRechazar={confirmarRechazar}
        onConvertir={() => setConvertirAbierto(true)}
        onImprimir={() => {
          if (cotizacionActiva) return imprimirPdf(cotizacionActiva);
        }}
        imprimiendo={imprimiendoPdf || cargandoLineas}
      />

      <ModalConvertirReserva
        abierto={convertirAbierto}
        cotizacion={cotizacionActiva}
        onCerrar={() => setConvertirAbierto(false)}
      />

      <ModalRechazarCotizacion
        abierto={confirmAbierto}
        cotizacion={cotizacionARechazar}
        cargando={rechazando}
        onConfirmar={ejecutarRechazar}
        onCancelar={cancelarRechazar}
      />
      {pdfCotizacion && (
        <DocumentoCotizacion cotizacion={pdfCotizacion} lineas={pdfLineas} />
      )}
    </div>
  );
}
