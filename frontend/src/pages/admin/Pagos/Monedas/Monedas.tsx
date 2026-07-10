import { useCallback, useEffect, useState } from 'react';
import { TablaDatos, BotonAccionTabla, PaginacionTabla } from '../../../../components/admin';
import Boton from '../../../../components/ui/Boton/Boton';
import { usePaginacionListado } from '../../../../hooks/usePaginacionListado';
import { listarMonedas } from '../../../../services/monedas';
import type { Moneda } from '../../../../types/pagos';import type { PropsSeccionPagos } from '../types';
import { mensajeError } from '../utils/mensajeError';
import PanelCrearMoneda from './CrearMoneda/PanelCrearMoneda';
import PanelEditarMoneda from './EditarMoneda/PanelEditarMoneda';
import ModalEliminarMoneda from './EliminarMoneda/ModalEliminarMoneda';
import { columnasMonedas } from './components/columnasMonedas';

export default function Monedas({
  activo,
  puedeCrear,
  puedeEditar,
  puedeBorrar,
  onExito,
  onError,
}: PropsSeccionPagos) {
  const [datos, setDatos] = useState<Moneda[]>([]);
  const [cargando, setCargando] = useState(false);
  const [panelCrearAbierto, setPanelCrearAbierto] = useState(false);
  const [panelEditarAbierto, setPanelEditarAbierto] = useState(false);
  const [monedaActiva, setMonedaActiva] = useState<Moneda | null>(null);
  const [monedaAEliminar, setMonedaAEliminar] = useState<Moneda | null>(null);
  const { pagina, setTotal, total, totalPaginas, irPagina, limite } = usePaginacionListado();

  const recargar = useCallback(async () => {
    setCargando(true);
    try {
      const respuesta = await listarMonedas({ pagina, limite });
      setDatos(respuesta.items);
      setTotal(respuesta.total);
    } catch (err) {
      onError(mensajeError(err, 'monedas'));
    } finally {
      setCargando(false);
    }
  }, [onError, pagina, limite, setTotal]);
  useEffect(() => {
    if (activo) recargar();
  }, [activo, recargar]);

  const hayAcciones = puedeEditar || puedeBorrar;
  if (!activo) return null;

  return (
    <>
      <div className="pagos-admin__toolbar">
        {puedeCrear && (
          <Boton variante="primario" tamano="sm" onClick={() => setPanelCrearAbierto(true)}>
            + Nueva moneda
          </Boton>
        )}
      </div>

      <TablaDatos
        columnas={columnasMonedas}
        datos={datos}
        cargando={cargando}
        mensajeVacio="No hay monedas registradas."
        idFila={(m) => m.id}
        onFilaClick={puedeEditar ? (m) => { setMonedaActiva(m); setPanelEditarAbierto(true); } : undefined}
        accionesFila={
          hayAcciones
            ? (m) => (
                <>
                  {puedeEditar && (
                    <BotonAccionTabla
                      accion="editar"
                      onClick={(e) => { e.stopPropagation(); setMonedaActiva(m); setPanelEditarAbierto(true); }}
                    />
                  )}
                  {puedeBorrar && (
                    <BotonAccionTabla
                      accion="eliminar"
                      onClick={(e) => { e.stopPropagation(); setMonedaAEliminar(m); }}
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

      <PanelCrearMoneda
        abierto={panelCrearAbierto}
        onCerrar={() => setPanelCrearAbierto(false)}
        onExito={onExito}
        onError={onError}
        onRecargar={recargar}
      />

      <PanelEditarMoneda
        abierto={panelEditarAbierto}
        moneda={monedaActiva}
        onCerrar={() => { setPanelEditarAbierto(false); setMonedaActiva(null); }}
        onExito={onExito}
        onError={onError}
        onRecargar={recargar}
      />

      <ModalEliminarMoneda
        abierto={Boolean(monedaAEliminar)}
        moneda={monedaAEliminar}
        onCerrar={() => setMonedaAEliminar(null)}
        onExito={onExito}
        onError={onError}
        onRecargar={recargar}
        onCerrarEdicion={() => {
          if (monedaActiva?.id === monedaAEliminar?.id) {
            setPanelEditarAbierto(false);
            setMonedaActiva(null);
          }
        }}
      />
    </>
  );
}
