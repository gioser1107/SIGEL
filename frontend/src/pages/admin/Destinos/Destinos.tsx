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
import useAutenticacion from '../../../hooks/useAutenticacion';
import type { Destino } from '../../../types/destino';
import type { FiltroListado } from '../../../types/paginacion';
import ModalAnularDestino from './AnularDestino/ModalAnularDestino';
import PanelEditarDestino from './EditarDestino/PanelEditarDestino';
import PanelNuevoDestino from './NuevoDestino/PanelNuevoDestino';
import { columnasDestinos } from './components/columnasDestinos';
import VistaTarjetasDestinos from './components/VistaTarjetasDestinos';
import { PESTANIAS_FILTRO } from './constants';
import { useDestinos } from './hooks/useDestinos';
import './Destinos.css';

export default function Destinos() {
  const { puedeBorrar } = useAutenticacion();
  const puedeAnularDestino = puedeBorrar('destinos');

  const {
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
  } = useDestinos();

  const esTabAnulados = filtroTab === 'anulado';

  const columnas = useMemo(() => columnasDestinos(esTabAnulados), [esTabAnulados]);

  const pestaniasConContador: PestaniaFiltro[] = PESTANIAS_FILTRO.map((t) => ({
    ...t,
    contador: t.id === filtroTab ? total : undefined,
  }));

  return (
    <div className="destinos">
      <CabeceraModulo
        migaja="TravelBqto / Admin"
        titulo="Destinos"
        contador={total}
        acciones={
          <Boton variante="primario" tamano="sm" onClick={abrirCrear}>
            + Nuevo destino
          </Boton>
        }
      />

      <PestaniasFiltro
        pestanias={pestaniasConContador}
        activa={filtroTab}
        onChange={(id) => { setFiltroTab(id as FiltroListado); reiniciarPagina(); }}
      />

      <div className="destinos__toolbar">
        <div className="destinos__toolbar-izq">
          <AlternadorVista vista={vista} onChange={setVista} />
          <div className="destinos__busqueda">
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
              placeholder="Buscar destino..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              aria-label="Buscar destinos"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="destinos__error" role="alert">
          {error}
        </div>
      )}

      {vista === 'tabla' && (
        <TablaDatos
          columnas={columnas}
          datos={destinosFiltrados}
          cargando={cargando}
          mensajeVacio={
            esTabAnulados
              ? 'No hay destinos anulados.'
              : 'No hay destinos registrados.'
          }
          accionesVacio={
            esTabAnulados ? undefined : (
              <Boton variante="primario" tamano="sm" onClick={abrirCrear}>
                + Nuevo destino
              </Boton>
            )
          }
          idFila={(d) => d.id}
          onFilaClick={esTabAnulados ? undefined : abrirEditar}
          accionesFila={
            esTabAnulados
              ? undefined
              : (destino: Destino) => (
                  <>
                    <BotonAccionTabla
                      accion="editar"
                      onClick={() => abrirEditar(destino)}
                      ariaLabel={`Editar ${destino.nombre}`}
                    />
                    {puedeAnularDestino && (
                      <BotonAccionTabla
                        accion="anular"
                        onClick={() => confirmarAnular(destino)}
                        ariaLabel={`Anular ${destino.nombre}`}
                      />
                    )}
                  </>
                )
          }
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
        <VistaTarjetasDestinos
          datos={destinosFiltrados}
          cargando={cargando}
          soloLectura={esTabAnulados}
          onEditar={abrirEditar}
          onAnular={puedeAnularDestino && !esTabAnulados ? confirmarAnular : undefined}
        />
      )}

      <PanelNuevoDestino
        abierto={drawerAbierto && drawerModo === 'crear'}
        form={form}
        archivoPortada={archivoPortada}
        guardando={guardando}
        errorForm={errorForm}
        onCerrar={cerrarDrawer}
        onGuardar={guardar}
        onFormChange={setForm}
        onArchivoPortadaChange={setArchivoPortada}
      />

      <PanelEditarDestino
        abierto={drawerAbierto && drawerModo === 'editar'}
        destino={destinoActivo}
        form={form}
        guardando={guardando}
        errorForm={errorForm}
        imagenes={imagenes}
        archivoNuevo={archivoNuevo}
        cargandoImagenes={cargandoImagenes}
        errorImagenes={errorImagenes}
        onCerrar={cerrarDrawer}
        onGuardar={guardar}
        onFormChange={setForm}
        onArchivoNuevoChange={setArchivoNuevo}
        onSubirImagen={subirImagen}
        onMarcarPortada={marcarPortada}
        onQuitarImagen={quitarImagen}
      />

      <ModalAnularDestino
        abierto={confirmAbierto}
        destino={destinoAAnular}
        cargando={anulando}
        error={errorAnular}
        onConfirmar={ejecutarAnular}
        onCancelar={cancelarAnular}
      />
    </div>
  );
}
