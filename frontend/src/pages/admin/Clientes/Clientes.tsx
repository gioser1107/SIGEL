import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CabeceraModulo,
  PestaniasFiltro,
  TablaDatos,
  BotonAccionTabla,
  PaginacionTabla,
} from '../../../components/admin';
import type { PestaniaFiltro } from '../../../components/admin';
import Boton from '../../../components/ui/Boton/Boton';
import useAutenticacion from '../../../hooks/useAutenticacion';
import { usePaginacionListado } from '../../../hooks/usePaginacionListado';
import { listarClientes } from '../../../services/clientes';
import type { Cliente } from '../../../types/cliente';
import PanelCrearCliente from './CrearCliente/PanelCrearCliente';
import PanelEditarCliente from './EditarCliente/PanelEditarCliente';
import ModalDesactivarCliente from './DesactivarCliente/ModalDesactivarCliente';
import { columnasClientes } from './components/columnasClientes';
import { MODULO, PESTANIAS } from './constants';
import { mensajeError } from './utils/mensajeError';
import '../Cotizaciones/Cotizaciones.css';
import './Clientes.css';

export default function Clientes() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { puedeCrear, puedeEditar, puedeBorrar } = useAutenticacion();
  const puedeCrearCliente = puedeCrear(MODULO);
  const puedeEditarCliente = puedeEditar(MODULO);
  const puedeDesactivarCliente = puedeBorrar(MODULO);
  const hayAccionesFila = puedeEditarCliente || puedeDesactivarCliente;

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [filtroTab, setFiltroTab] = useState('todos');
  const [busqueda, setBusqueda] = useState('');

  const [panelCrearAbierto, setPanelCrearAbierto] = useState(false);
  const [panelEditarAbierto, setPanelEditarAbierto] = useState(false);
  const [clienteActivo, setClienteActivo] = useState<Cliente | null>(null);

  const [confirmAbierto, setConfirmAbierto] = useState(false);
  const [clienteADesactivar, setClienteADesactivar] = useState<Cliente | null>(null);
  const { pagina, setTotal, total, totalPaginas, irPagina, reiniciarPagina, limite } = usePaginacionListado();

  const cargarClientes = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const respuesta = await listarClientes({
        pagina,
        limite,
        buscar: busqueda.trim() || undefined,
      });
      setClientes(respuesta.items);
      setTotal(respuesta.total);
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  }, [pagina, limite, busqueda, setTotal]);

  useEffect(() => {
    cargarClientes();
  }, [cargarClientes]);

  const editarDesdeQuery = useRef<number | null>(null);

  useEffect(() => {
    const idParam = searchParams.get('editar');
    if (!idParam || clientes.length === 0) return;
    const id = Number(idParam);
    if (Number.isNaN(id) || editarDesdeQuery.current === id) return;
    const cliente = clientes.find((c) => c.cliente_id === id);
    if (!cliente) return;
    editarDesdeQuery.current = id;
    setClienteActivo(cliente);
    setPanelEditarAbierto(true);
    setSearchParams({}, { replace: true });
  }, [searchParams, clientes, setSearchParams]);

  const clientesFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return clientes.filter((c) => {
      const coincideTab = filtroTab === 'todos' || c.tipo_cliente === filtroTab;
      const coincideBusqueda =
        !q ||
        c.nombre.toLowerCase().includes(q) ||
        c.apellido.toLowerCase().includes(q) ||
        (c.razon_social ?? '').toLowerCase().includes(q) ||
        c.numero_documento.toLowerCase().includes(q) ||
        (c.ciudad ?? '').toLowerCase().includes(q) ||
        `${c.tipo_documento}${c.numero_documento}`.toLowerCase().includes(q);
      return coincideTab && coincideBusqueda;
    });
  }, [clientes, filtroTab, busqueda]);

  const pestaniasConContador: PestaniaFiltro[] = PESTANIAS.map((p) => ({
    ...p,
    contador: p.id === filtroTab ? total : undefined,
  }));

  function abrirCrear() {
    if (!puedeCrearCliente) return;
    setPanelCrearAbierto(true);
  }

  function abrirEditar(cliente: Cliente) {
    if (!puedeEditarCliente) return;
    setClienteActivo(cliente);
    setPanelEditarAbierto(true);
  }

  function pedirDesactivar(cliente: Cliente) {
    if (!puedeDesactivarCliente) return;
    setClienteADesactivar(cliente);
    setConfirmAbierto(true);
  }

  function alDesactivarExito() {
    setExito('Cliente desactivado correctamente.');
    const idDesactivado = clienteADesactivar?.cliente_id;
    setConfirmAbierto(false);
    setClienteADesactivar(null);
    if (clienteActivo?.cliente_id === idDesactivado) {
      setPanelEditarAbierto(false);
      setClienteActivo(null);
    }
    cargarClientes();
  }

  return (
    <div className="clientes">
      <CabeceraModulo
        migaja="TravelBqto / Admin"
        titulo="Clientes"
        contador={total}
        descripcion="Fichas de clientes captadas por ATC o administración. Sin registro público por ahora."
        acciones={
          puedeCrearCliente ? (
            <Boton variante="primario" tamano="sm" onClick={abrirCrear}>
              + Nuevo cliente
            </Boton>
          ) : undefined
        }
      />

      <PestaniasFiltro
        pestanias={pestaniasConContador}
        activa={filtroTab}
        onChange={(id) => { setFiltroTab(id); reiniciarPagina(); }}
      />

      <div className="cotizaciones__toolbar">
        <div className="cotizaciones__toolbar-izq">
          <div className="cotizaciones__busqueda">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por nombre, documento o ciudad…"
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                reiniciarPagina();
              }}
              aria-label="Buscar clientes"
            />
          </div>
        </div>
      </div>

      {error && <div className="cotizaciones__error" role="alert">{error}</div>}
      {exito && <div className="clientes__alerta-exito" role="status">{exito}</div>}

      <TablaDatos
        columnas={columnasClientes}
        datos={clientesFiltrados}
        cargando={cargando}
        mensajeVacio="No hay clientes registrados."
        accionesVacio={
          puedeCrearCliente ? (
            <Boton variante="primario" tamano="sm" onClick={abrirCrear}>
              + Nuevo cliente
            </Boton>
          ) : undefined
        }
        idFila={(c) => c.cliente_id}
        onFilaClick={puedeEditarCliente ? abrirEditar : undefined}
        accionesFila={
          hayAccionesFila
            ? (c) => (
                <>
                  {puedeEditarCliente && (
                    <BotonAccionTabla
                      accion="editar"
                      onClick={(e) => { e.stopPropagation(); abrirEditar(c); }}
                    />
                  )}
                  {puedeDesactivarCliente && (
                    <BotonAccionTabla
                      accion="desactivar"
                      onClick={(e) => { e.stopPropagation(); pedirDesactivar(c); }}
                    />
                  )}
                </>
              )
            : undefined
        }
      />

      <PaginacionTabla
        pagina={pagina}
        totalPaginas={totalPaginas}
        total={total}
        limite={limite}
        onPaginaChange={irPagina}
      />

      <PanelCrearCliente
        abierto={panelCrearAbierto}
        onCerrar={() => setPanelCrearAbierto(false)}
        onExito={setExito}
        onError={setError}
        onRecargar={cargarClientes}
      />

      <PanelEditarCliente
        abierto={panelEditarAbierto}
        cliente={clienteActivo}
        onCerrar={() => {
          setPanelEditarAbierto(false);
          setClienteActivo(null);
        }}
        onExito={setExito}
        onError={setError}
        onRecargar={cargarClientes}
      />

      <ModalDesactivarCliente
        abierto={confirmAbierto}
        cliente={clienteADesactivar}
        onCerrar={() => setConfirmAbierto(false)}
        onDesactivadoExito={alDesactivarExito}
        onError={setError}
      />
    </div>
  );
}
