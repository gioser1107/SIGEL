import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CabeceraModulo, PestaniasFiltro, TablaDatos, BotonAccionTabla, PaginacionTabla } from '../../../components/admin';
import type { Columna, PestaniaFiltro } from '../../../components/admin';
import Boton from '../../../components/ui/Boton/Boton';
import { usePaginacionListado } from '../../../hooks/usePaginacionListado';
import { listarPuntosRecogidaAdmin } from '../../../services/puntos_recogida';
import type { PuntoRecogidaListado } from '../../../types/puntoRecogida';
import { ErrorApi } from '../../../services/api';
import '../Clientes/Clientes.css';
import DetallePuntoRecogida from './DetallePuntoRecogida';
import './PuntosRecogida.css';

const PESTANIAS: PestaniaFiltro[] = [
  { id: 'listado', etiqueta: 'Listado' },
  { id: 'detalle', etiqueta: 'Detalle' },
];

function nombreClienteFila(p: PuntoRecogidaListado): string {
  if (p.cliente_nombre || p.cliente_apellido) {
    return `${p.cliente_nombre ?? ''} ${p.cliente_apellido ?? ''}`.trim();
  }
  if (p.cliente_id) return `Cliente #${p.cliente_id}`;
  return '—';
}

function documentoClienteFila(p: PuntoRecogidaListado): string | null {
  if (p.cliente_tipo_documento && p.cliente_numero_documento) {
    return `${p.cliente_tipo_documento}-${p.cliente_numero_documento}`;
  }
  return null;
}

const columnas: Columna<PuntoRecogidaListado>[] = [
  { id: 'nombre', encabezado: 'Nombre', accessor: (p) => p.nombre },
  { id: 'dir', encabezado: 'Dirección', accessor: (p) => p.direccion ?? '—' },
  { id: 'ciudad', encabezado: 'Ciudad', accessor: (p) => p.ciudad ?? '—' },
  {
    id: 'cliente',
    encabezado: 'Cliente',
    accessor: (p) => {
      const doc = documentoClienteFila(p);
      const nombre = nombreClienteFila(p);
      if (p.cliente_id && nombre !== '—') {
        return (
          <Link to={`/admin/clientes?editar=${p.cliente_id}`} className="puntos-recogida-admin__link-tabla">
            {nombre}
            {doc && <span className="puntos-recogida-admin__doc-inline"> · {doc}</span>}
          </Link>
        );
      }
      return nombre;
    },
  },
  {
    id: 'activo',
    encabezado: 'Activo',
    accessor: (p) => (p.activo === false ? 'No' : 'Sí'),
  },
  {
    id: 'predeterminado',
    encabezado: 'Predeterminado',
    accessor: (p) => (p.es_predeterminado ? 'Sí' : '—'),
  },
];

export default function PuntosRecogidaAdmin() {
  const [datos, setDatos] = useState<PuntoRecogidaListado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [buscar, setBuscar] = useState('');
  const [buscarAplicado, setBuscarAplicado] = useState('');
  const [soloActivos, setSoloActivos] = useState(true);
  const [pestania, setPestania] = useState('listado');
  const [puntoSeleccionado, setPuntoSeleccionado] = useState<PuntoRecogidaListado | null>(null);
  const { pagina, setTotal, total, totalPaginas, irPagina, reiniciarPagina, limite } = usePaginacionListado();

  const recargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const respuesta = await listarPuntosRecogidaAdmin({
        buscar: buscarAplicado || undefined,
        solo_activos: soloActivos,
        pagina,
        limite,
      });
      setDatos(respuesta.items);
      setTotal(respuesta.total);
    } catch (err) {
      setError(err instanceof ErrorApi ? err.message : 'Error al cargar domicilios.');
    } finally {
      setCargando(false);
    }
  }, [buscarAplicado, soloActivos, pagina, limite, setTotal]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  useEffect(() => {
    if (pestania === 'detalle' && !puntoSeleccionado) {
      setPestania('listado');
    }
  }, [pestania, puntoSeleccionado]);

  function aplicarBusqueda() {
    setBuscarAplicado(buscar.trim());
    reiniciarPagina();
  }

  function abrirDetalle(p: PuntoRecogidaListado) {
    setPuntoSeleccionado(p);
    setPestania('detalle');
  }

  function volverListado() {
    setPestania('listado');
  }

  function cambiarPestania(id: string) {
    if (id === 'detalle' && !puntoSeleccionado) return;
    setPestania(id);
  }

  return (
    <div className="puntos-recogida-admin">
      <CabeceraModulo
        migaja="TravelBqto / Admin"
        titulo="Puntos de recogida"
        contador={total}
        descripcion="Consulta de domicilios registrados por clientes."
      />

      <PestaniasFiltro pestanias={PESTANIAS} activa={pestania} onChange={cambiarPestania} />

      {pestania === 'listado' && (
        <>
          <div className="puntos-recogida-admin__filtros">
            <div className="puntos-recogida-admin__busqueda">
              <input
                type="search"
                className="drawer-form__input"
                placeholder="Buscar por nombre, dirección, cliente…"
                value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && aplicarBusqueda()}
                aria-label="Buscar domicilios"
              />
              <Boton variante="secundario" tamano="sm" onClick={aplicarBusqueda}>
                Buscar
              </Boton>
            </div>
            <label className="puntos-recogida-admin__check">
              <input
                type="checkbox"
                checked={soloActivos}
                onChange={(e) => { setSoloActivos(e.target.checked); reiniciarPagina(); }}
              />
              Solo activos
            </label>
          </div>

          <p className="puntos-recogida-admin__nota-consulta">
            Pantalla de consulta. Para administrar domicilios, abra{' '}
            <Link to="/admin/clientes">Clientes</Link> y edite la ficha del cliente.
          </p>

          {error && <div className="clientes__alerta clientes__alerta--error">{error}</div>}

          <TablaDatos
            columnas={columnas}
            datos={datos}
            cargando={cargando}
            mensajeVacio="No hay domicilios que coincidan con los filtros."
            idFila={(p) => p.id}
            onFilaClick={abrirDetalle}
            accionesFila={(p) => (
              <BotonAccionTabla
                accion="ver"
                onClick={(e) => {
                  e.stopPropagation();
                  abrirDetalle(p);
                }}
              />
            )}
          />

          <PaginacionTabla
            pagina={pagina}
            totalPaginas={totalPaginas}
            total={total}
            limite={limite}
            onPaginaChange={irPagina}
          />
        </>
      )}

      {pestania === 'detalle' && puntoSeleccionado && (
        <DetallePuntoRecogida punto={puntoSeleccionado} onVolver={volverListado} />
      )}
    </div>
  );
}
