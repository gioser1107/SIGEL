import { useMemo } from 'react';
import { CabeceraModulo, TablaDatos } from '../../../components/admin';
import Boton from '../../../components/ui/Boton/Boton';
import BarraFiltrosBitacora from './components/BarraFiltrosBitacora';
import PanelDetalleBitacora from './components/PanelDetalleBitacora';
import { columnasBitacora } from './components/columnasBitacora';
import { useBitacora } from './hooks/useBitacora';
import './Bitacora.css';

export default function Bitacora() {
  const {
    registros,
    total,
    pagina,
    totalPaginas,
    cargando,
    error,
    busqueda,
    filtroModulo,
    filtroAccion,
    fechaDesde,
    fechaHasta,
    panelAbierto,
    entradaActiva,
    cargandoDetalle,
    abrirDetalle,
    cerrarPanel,
    cambiarBusqueda,
    cambiarFiltroModulo,
    cambiarFiltroAccion,
    cambiarFechaDesde,
    cambiarFechaHasta,
    irPagina,
  } = useBitacora();

  const columnas = useMemo(() => columnasBitacora(), []);

  return (
    <div className="bitacora">
      <CabeceraModulo
        migaja="Administración"
        titulo="Bitácora del Sistema"
        contador={total}
        descripcion="Registro de auditoría de todas las operaciones del sistema."
      />

      <BarraFiltrosBitacora
        busqueda={busqueda}
        filtroModulo={filtroModulo}
        filtroAccion={filtroAccion}
        fechaDesde={fechaDesde}
        fechaHasta={fechaHasta}
        onBusquedaChange={cambiarBusqueda}
        onModuloChange={cambiarFiltroModulo}
        onAccionChange={cambiarFiltroAccion}
        onFechaDesdeChange={cambiarFechaDesde}
        onFechaHastaChange={cambiarFechaHasta}
      />

      {error && <div className="bitacora__error">{error}</div>}

      <TablaDatos
        columnas={columnas}
        datos={registros}
        cargando={cargando}
        mensajeVacio="No hay registros en la bitácora con los filtros seleccionados."
        onFilaClick={abrirDetalle}
        idFila={(fila) => fila.id}
      />

      {total > 0 && (
        <div className="bitacora__paginacion">
          <span className="bitacora__paginacion-info">
            Página {pagina} de {totalPaginas} — {total} registros
          </span>
          <div className="bitacora__paginacion-botones">
            <Boton
              variante="secundario"
              tamano="sm"
              disabled={pagina <= 1}
              onClick={() => irPagina(pagina - 1)}
            >
              Anterior
            </Boton>
            <Boton
              variante="secundario"
              tamano="sm"
              disabled={pagina >= totalPaginas}
              onClick={() => irPagina(pagina + 1)}
            >
              Siguiente
            </Boton>
          </div>
        </div>
      )}

      <PanelDetalleBitacora
        abierto={panelAbierto}
        cargando={cargandoDetalle}
        entrada={entradaActiva}
        onCerrar={cerrarPanel}
      />
    </div>
  );
}
