import { useCallback, useEffect, useState } from 'react';
import {
  CuadriculaTarjetas,
  ModalConfirmacion,
  TablaDatos,
  CabeceraModulo,
  AlternadorVista,
  BotonAccionTabla,
  PaginacionTabla,
} from '../../../components/admin';
import type { Columna } from '../../../components/admin';
import { useVistaModuloResponsive } from '../../../hooks/useVistaModuloResponsive';
import { usePaginacionListado } from '../../../hooks/usePaginacionListado';
import Boton from '../../../components/ui/Boton/Boton';
import { eliminarUnidad, obtenerUnidades } from '../../../services/unidades';
import type { UnidadTransporte } from '../../../types/unidad';
import FormularioUnidad from './FormularioUnidad';
import GestionAsientos from './GestionAsientos';
import './Flota.css';

export default function Flota() {
  const [unidades, setUnidades] = useState<UnidadTransporte[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [vista, setVista] = useVistaModuloResponsive();

  // Formulario de Unidad
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [unidadSeleccionada, setUnidadSeleccionada] = useState<UnidadTransporte | null>(null);

  // Gestión de Asientos
  const [asientosAbierto, setAsientosAbierto] = useState(false);
  const [unidadParaAsientos, setUnidadParaAsientos] = useState<UnidadTransporte | null>(null);

  // Confirmar Eliminar
  const [confirmAbierto, setConfirmAbierto] = useState(false);
  const [unidadAEliminar, setUnidadAEliminar] = useState<UnidadTransporte | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const { pagina, setTotal, total, totalPaginas, irPagina, limite } = usePaginacionListado();

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const respuesta = await obtenerUnidades({ pagina, limite });
      setUnidades(respuesta.items);
      setTotal(respuesta.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar las unidades de transporte');
    } finally {
      setCargando(false);
    }
  }, [pagina, limite, setTotal]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const abrirCrear = () => {
    setUnidadSeleccionada(null);
    setFormularioAbierto(true);
  };

  const abrirEditar = (unidad: UnidadTransporte) => {
    setUnidadSeleccionada(unidad);
    setFormularioAbierto(true);
  };

  const abrirGestionAsientos = (unidad: UnidadTransporte) => {
    setUnidadParaAsientos(unidad);
    setAsientosAbierto(true);
  };

  const confirmarEliminar = (unidad: UnidadTransporte) => {
    setUnidadAEliminar(unidad);
    setConfirmAbierto(true);
  };

  const ejecutarEliminar = async () => {
    if (!unidadAEliminar) return;
    setEliminando(true);
    try {
      await eliminarUnidad(unidadAEliminar.id);
      await cargarDatos();
      setConfirmAbierto(false);
      setUnidadAEliminar(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al eliminar unidad');
    } finally {
      setEliminando(false);
    }
  };

  const unidadesFiltradas = unidades.filter((u) => {
    const texto = busqueda.toLowerCase();
    return (
      !texto ||
      u.placa.toLowerCase().includes(texto) ||
      (u.modelo ?? '').toLowerCase().includes(texto)
    );
  });

  const columnas: Columna<UnidadTransporte>[] = [
    {
      id: 'placa',
      encabezado: 'Placa',
      accessor: (u) => <span className="flota-tabla__placa">{u.placa}</span>,
    },
    {
      id: 'modelo',
      encabezado: 'Modelo',
      accessor: (u) => u.modelo || '—',
    },
    {
      id: 'capacidad',
      encabezado: 'Capacidad',
      alineacion: 'center',
      accessor: (u) => `${u.capacidad} pax`,
    },
    {
      id: 'acciones',
      encabezado: 'Acciones',
      alineacion: 'right',
      accessor: (u) => (
        <div className="flota-tabla__acciones">
          <BotonAccionTabla
            accion="asientos"
            onClick={(e) => { e.stopPropagation(); abrirGestionAsientos(u); }}
          />
          <BotonAccionTabla
            accion="editar"
            onClick={(e) => { e.stopPropagation(); abrirEditar(u); }}
          />
          <BotonAccionTabla
            accion="eliminar"
            onClick={(e) => { e.stopPropagation(); confirmarEliminar(u); }}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="flota">
      <CabeceraModulo
        migaja="TravelBqto / Admin"
        titulo="Flota y transporte"
        contador={total}
        descripcion="Gestión de unidades de transporte (autobuses) y distribución de asientos."
        acciones={
          <Boton variante="primario" tamano="sm" onClick={abrirCrear}>
            + Nueva Unidad
          </Boton>
        }
      />

      <div className="flota__toolbar">
        <div className="flota__toolbar-izq">
          <AlternadorVista vista={vista} onChange={setVista} />
          <div className="flota__busqueda">
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
              placeholder="Buscar por placa o modelo..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              aria-label="Buscar unidades"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="flota__error" role="alert">
          {error}
        </div>
      )}

      {vista === 'tabla' && (
        <TablaDatos
          columnas={columnas}
          datos={unidadesFiltradas}
          cargando={cargando}
          mensajeVacio="No se encontraron unidades de transporte."
          accionesVacio={
            <Boton variante="primario" tamano="sm" onClick={abrirCrear}>
              + Nueva Unidad
            </Boton>
          }
          idFila={(u) => u.id}
          onFilaClick={abrirEditar}
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
        <CuadriculaTarjetas
          datos={unidadesFiltradas}
          cargando={cargando}
          columnas={3}
          mensajeVacio="No se encontraron unidades de transporte."
          renderTarjeta={(unidad) => (
            <div key={unidad.id} className="flota-card">
              <div className="flota-card__header">
                <span className="flota-card__placa">{unidad.placa}</span>
              </div>
              <p className="flota-card__modelo">{unidad.modelo || 'Sin modelo registrado'}</p>
              <div className="flota-card__capacidad">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                {unidad.capacidad} asientos
              </div>
              <div className="flota-card__acciones">
                <BotonAccionTabla
                  accion="asientos"
                  onClick={(e) => { e.stopPropagation(); abrirGestionAsientos(unidad); }}
                />
                <BotonAccionTabla
                  accion="editar"
                  onClick={(e) => { e.stopPropagation(); abrirEditar(unidad); }}
                />
                <BotonAccionTabla
                  accion="eliminar"
                  onClick={(e) => { e.stopPropagation(); confirmarEliminar(unidad); }}
                />
              </div>
            </div>
          )}
        />
      )}

      <FormularioUnidad
        abierto={formularioAbierto}
        onCerrar={() => setFormularioAbierto(false)}
        unidad={unidadSeleccionada}
        onGuardado={cargarDatos}
      />

      <GestionAsientos
        abierto={asientosAbierto}
        onCerrar={() => setAsientosAbierto(false)}
        unidad={unidadParaAsientos}
      />

      <ModalConfirmacion
        abierto={confirmAbierto}
        titulo="Eliminar unidad de transporte"
        mensaje={`¿Confirmas que deseas eliminar el autobús con placa "${unidadAEliminar?.placa}"? Esta acción no se puede deshacer y fallará si tiene viajes asociados.`}
        textoConfirmar="Sí, eliminar"
        cargando={eliminando}
        onConfirmar={ejecutarEliminar}
        onCancelar={() => {
          setConfirmAbierto(false);
          setUnidadAEliminar(null);
        }}
      />
    </div>
  );
}
