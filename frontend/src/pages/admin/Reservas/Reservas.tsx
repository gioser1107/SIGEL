import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CabeceraModulo,
  PestaniasFiltro,
  TablaDatos,
  EtiquetaEstado,
  BotonAccionTabla,
  PaginacionTabla,
} from '../../../components/admin';
import type { Columna, PestaniaFiltro } from '../../../components/admin';
import Boton from '../../../components/ui/Boton/Boton';
import BtnImprimirReporte from '../../../components/ui/BtnImprimirReporte/BtnImprimirReporte';
import CabeceraReporteImpresion from '../../../components/ui/CabeceraReporteImpresion/CabeceraReporteImpresion';
import TablaReporteImpresion from '../../../components/ui/TablaReporteImpresion/TablaReporteImpresion';
import useAutenticacion from '../../../hooks/useAutenticacion';
import { usePaginacionListado } from '../../../hooks/usePaginacionListado';
import { ErrorApi } from '../../../services/api';
import { obtenerReservas, obtenerPasajerosDeReserva } from '../../../services/reservas';
import { listarClientesParaSelect } from '../../../services/clientes';
import { obtenerViajes } from '../../../services/viajes';
import { LIMITE_PAGINA_MAX, type FiltroListado } from '../../../types/paginacion';
import type { ReservaCliente, ReservaEnriquecida } from '../../../types/reservas';
import { codigoReserva, SIN_DATO, textoVisible } from '../../../utils/etiquetasNegocio';
import { nombreCompleto } from '../../../utils/nombrePersona';
import PanelDetalleReserva from './components/PanelDetalleReserva';
import ModalEliminarReserva from './components/ModalEliminarReserva';
import './Reservas.css';

const MODULO = 'reservas';

const PESTANIAS: PestaniaFiltro[] = [
  { id: 'todos', etiqueta: 'Todas' },
  { id: 'pendiente', etiqueta: 'Pendientes' },
  { id: 'confirmada', etiqueta: 'Confirmadas' },
  { id: 'abonada', etiqueta: 'Abonadas' },
  { id: 'cancelada', etiqueta: 'Canceladas' },
  { id: 'anulado', etiqueta: 'Anuladas' },
];

const ESTADO_VARIANTE: Record<string, "neutro" | "info" | "exito" | "error" | "advertencia"> = {
  pendiente: 'advertencia',
  confirmada: 'exito',
  abonada: 'info',
  cancelada: 'error',
};

const ETIQUETA_ESTADO_RESERVA: Record<string, string> = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  abonada: 'Abonada',
  cancelada: 'Cancelada',
  anulado: 'Anulada',
};

const COLUMNAS_REPORTE_RESERVAS = [
  { encabezado: 'Código', clave: 'codigo' },
  { encabezado: 'Cliente', clave: 'cliente' },
  { encabezado: 'Viaje / Destino', clave: 'viaje' },
  { encabezado: 'Fecha reserva', clave: 'fecha' },
  { encabezado: 'Estado', clave: 'estado' },
] as const;

function mensajeError(err: unknown): string {
  if (err instanceof ErrorApi && err.status === 403) {
    return 'No tienes permiso para gestionar reservas.';
  }
  if (err instanceof ErrorApi) return err.message;
  if (err instanceof Error) return err.message;
  return 'Ocurrió un error inesperado.';
}

export default function Reservas() {
  const navegar = useNavigate();
  const { puedeCrear, puedeBorrar } = useAutenticacion();
  const puedeCrearReserva = puedeCrear(MODULO);
  const puedeBorrarReserva = puedeBorrar(MODULO);

  const [reservas, setReservas] = useState<ReservaEnriquecida[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  const [filtroTab, setFiltroTab] = useState<FiltroListado>('todos');
  const [busqueda, setBusqueda] = useState('');

  // Detalles Side Sheet
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [reservaActiva, setReservaActiva] = useState<ReservaEnriquecida | null>(null);
  const [pasajerosActivos, setPasajerosActivos] = useState<ReservaCliente[]>([]);
  const [cargandoDetalles, setCargandoDetalles] = useState(false);

  // Modal Eliminar
  const [confirmAbierto, setConfirmAbierto] = useState(false);
  const [reservaAEliminar, setReservaAEliminar] = useState<ReservaEnriquecida | null>(null);
  const { pagina, setTotal, total, totalPaginas, irPagina, reiniciarPagina, limite } = usePaginacionListado();

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [resData, clientesData, viajesData] = await Promise.all([
        obtenerReservas({
          pagina,
          limite,
          ...(filtroTab === 'anulado'
            ? { filtro: 'anulado' }
            : filtroTab !== 'todos'
              ? { filtro: filtroTab }
              : {}),
        }),
        listarClientesParaSelect(),
        obtenerViajes({ pagina: 1, limite: LIMITE_PAGINA_MAX }),
      ]);

      setTotal(resData.total);
      const clientesMap = new Map(clientesData.map((c) => [c.cliente_id, c]));
      const viajesMap = new Map(viajesData.items.map((v) => [v.id, v]));

      const reservasEnriquecidas = resData.items.map((r) => ({
        ...r,
        clienteObj: clientesMap.get(r.cliente_id),
        viajeObj: viajesMap.get(r.viaje_id),
      }));

      setReservas(reservasEnriquecidas);
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  }, [pagina, limite, filtroTab, setTotal]);

  useEffect(() => {
    const timer = setTimeout(() => {
      cargarDatos();
    }, 0);
    return () => clearTimeout(timer);
  }, [cargarDatos]);

  const esTabAnuladas = filtroTab === 'anulado';

  const reservasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return reservas.filter((r) => {
      const coincideBusqueda =
        !q ||
        r.clienteObj?.nombre.toLowerCase().includes(q) ||
        r.clienteObj?.apellido.toLowerCase().includes(q) ||
        r.viajeObj?.destino_nombre?.toLowerCase().includes(q);
      return coincideBusqueda;
    });
  }, [reservas, busqueda]);

  const pestaniasConContador: PestaniaFiltro[] = PESTANIAS.map((p) => ({
    ...p,
    contador: p.id === filtroTab ? total : undefined,
  }));

  const etiquetaFiltroActivo = PESTANIAS.find((p) => p.id === filtroTab)?.etiqueta ?? 'Todas';

  const resumenReporte = useMemo(
    () => [
      { etiqueta: 'Registros', valor: reservasFiltradas.length },
      {
        etiqueta: 'Confirmadas',
        valor: reservasFiltradas.filter((r) => r.estado === 'confirmada' || r.estado === 'abonada')
          .length,
      },
      {
        etiqueta: 'Pendientes',
        valor: reservasFiltradas.filter((r) => r.estado === 'pendiente').length,
      },
      {
        etiqueta: 'Canceladas',
        valor: reservasFiltradas.filter((r) => r.estado === 'cancelada').length,
      },
    ],
    [reservasFiltradas],
  );

  const filasReporte = useMemo(
    () =>
      reservasFiltradas.map((r) => ({
        codigo: codigoReserva(r.id),
        cliente: r.clienteObj
          ? nombreCompleto(r.clienteObj.nombre, r.clienteObj.apellido)
          : SIN_DATO.cliente,
        viaje: textoVisible(r.viajeObj?.destino_nombre, SIN_DATO.viaje),
        fecha: new Date(r.fecha_reserva).toLocaleDateString('es-VE'),
        estado: ETIQUETA_ESTADO_RESERVA[r.estado] ?? r.estado,
      })),
    [reservasFiltradas],
  );

  async function abrirDetalles(reserva: ReservaEnriquecida) {
    setReservaActiva(reserva);
    setPanelAbierto(true);
    setCargandoDetalles(true);
    setPasajerosActivos([]);
    try {
      const pasajeros = await obtenerPasajerosDeReserva(reserva.id);
      setPasajerosActivos(pasajeros);
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargandoDetalles(false);
    }
  }

  function pedirEliminar(reserva: ReservaEnriquecida) {
    if (!puedeBorrarReserva) return;
    setReservaAEliminar(reserva);
    setConfirmAbierto(true);
  }

  function alEliminarExito() {
    setExito('Reserva eliminada correctamente.');
    setConfirmAbierto(false);
    setReservaAEliminar(null);
    if (reservaActiva?.id === reservaAEliminar?.id) {
      setPanelAbierto(false);
    }
    setFiltroTab('anulado');
    reiniciarPagina();
  }

  const columnas: Columna<ReservaEnriquecida>[] = [
    {
      id: 'id',
      encabezado: 'Código',
      accessor: (r) => codigoReserva(r.id),
    },
    {
      id: 'cliente',
      encabezado: 'Cliente',
      accessor: (r) => (
        <div className="reservas__tabla-nombre">
          <strong>{r.clienteObj ? nombreCompleto(r.clienteObj.nombre, r.clienteObj.apellido) : SIN_DATO.cliente}</strong>
        </div>
      ),
    },
    {
      id: 'viaje',
      encabezado: 'Viaje / Destino',
      accessor: (r) => (
        <div className="reservas__tabla-nombre">
          <strong>{textoVisible(r.viajeObj?.destino_nombre, SIN_DATO.viaje)}</strong>
        </div>
      ),
    },
    {
      id: 'fecha',
      encabezado: 'Fecha Rsv.',
      accessor: (r) => {
        const fechaObj = new Date(r.fecha_reserva);
        return `${fechaObj.toLocaleDateString()}`;
      },
    },
    {
      id: 'estado',
      encabezado: 'Estado',
      accessor: (r) => (
        <EtiquetaEstado
          etiqueta={ETIQUETA_ESTADO_RESERVA[r.estado] ?? r.estado}
          variante={ESTADO_VARIANTE[r.estado] ?? 'neutro'}
        />
      ),
    },
  ];

  return (
    <div className="reservas">
      <div className="no-imprimir">
        <CabeceraModulo
          migaja="TravelBqto / Admin"
          titulo="Reservas"
          contador={total}
          acciones={
            <>
              <BtnImprimirReporte deshabilitado={cargando || reservasFiltradas.length === 0} />
              {puedeCrearReserva && (
                <Boton variante="primario" tamano="sm" onClick={() => navegar('/admin/reservas/crear')}>
                  + Nueva reserva
                </Boton>
              )}
            </>
          }
        />
      </div>

      <div className="zona-imprimible">
        <CabeceraReporteImpresion
          titulo="Reporte de reservas"
          subtitulo="Reservas confirmadas, pendientes y canceladas para seguimiento comercial."
          filtroActivo={etiquetaFiltroActivo}
          resumen={resumenReporte}
        >
          <TablaReporteImpresion
            columnas={[...COLUMNAS_REPORTE_RESERVAS]}
            filas={filasReporte}
            mensajeVacio="No hay reservas que coincidan con el filtro activo."
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
          <div className="cotizaciones__busqueda">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por cliente o destino..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              aria-label="Buscar reservas"
            />
          </div>
        </div>
      </div>

      {error && <div className="cotizaciones__error" role="alert">{error}</div>}
      {exito && <div className="clientes__alerta-exito" role="status">{exito}</div>}

      <TablaDatos
        columnas={columnas}
        datos={reservasFiltradas}
        cargando={cargando}
        mensajeVacio={esTabAnuladas ? 'No hay reservas anuladas.' : 'No hay reservas registradas.'}
        accionesVacio={
          esTabAnuladas || !puedeCrearReserva ? undefined : (
            <Boton variante="primario" tamano="sm" onClick={() => navegar('/admin/reservas/crear')}>
              + Nueva reserva
            </Boton>
          )
        }
        idFila={(r) => r.id}
        onFilaClick={esTabAnuladas ? undefined : (r) => abrirDetalles(r)}
        accionesFila={
          esTabAnuladas
            ? undefined
            : (r) => (
          <>
            <BotonAccionTabla
              accion="ver"
              titulo="Ver detalle"
              onClick={(e) => { e.stopPropagation(); abrirDetalles(r); }}
            />
            {puedeBorrarReserva && (
              <BotonAccionTabla
                accion="eliminar"
                onClick={(e) => { e.stopPropagation(); pedirEliminar(r); }}
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
        </div>
      </div>

      <PanelDetalleReserva
        abierto={panelAbierto}
        onCerrar={() => setPanelAbierto(false)}
        reservaActiva={reservaActiva}
        pasajerosActivos={pasajerosActivos}
        cargandoDetalles={cargandoDetalles}
      />

      <ModalEliminarReserva
        abierto={confirmAbierto}
        reserva={reservaAEliminar}
        onCerrar={() => setConfirmAbierto(false)}
        onEliminadoExito={alEliminarExito}
        onError={(msg) => setError(msg)}
      />
    </div>
  );
}
