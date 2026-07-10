import { useCallback, useEffect, useState } from 'react';
import { TablaDatos, BotonAccionTabla, PaginacionTabla } from '../../../../components/admin';
import Boton from '../../../../components/ui/Boton/Boton';
import { usePaginacionListado } from '../../../../hooks/usePaginacionListado';
import { listarMetodosPago } from '../../../../services/metodosPago';
import { listarMonedasParaSelect } from '../../../../services/monedas';
import type { MetodoPago, Moneda } from '../../../../types/pagos';
import type { PropsSeccionPagos } from '../types';
import { mensajeError } from '../utils/mensajeError';
import PanelCrearMetodoPago from './CrearMetodoPago/PanelCrearMetodoPago';
import PanelEditarMetodoPago from './EditarMetodoPago/PanelEditarMetodoPago';
import ModalEliminarMetodoPago from './EliminarMetodoPago/ModalEliminarMetodoPago';
import { columnasMetodosPago } from './components/columnasMetodosPago';

export default function MetodosPago({
  activo,
  puedeCrear,
  puedeEditar,
  puedeBorrar,
  onExito,
  onError,
}: PropsSeccionPagos) {
  const [datos, setDatos] = useState<MetodoPago[]>([]);
  const [monedas, setMonedas] = useState<Moneda[]>([]);
  const [cargando, setCargando] = useState(false);
  const [panelCrearAbierto, setPanelCrearAbierto] = useState(false);
  const [panelEditarAbierto, setPanelEditarAbierto] = useState(false);
  const [metodoActivo, setMetodoActivo] = useState<MetodoPago | null>(null);
  const [metodoAEliminar, setMetodoAEliminar] = useState<MetodoPago | null>(null);
  const { pagina, setTotal, total, totalPaginas, irPagina, limite } = usePaginacionListado();

  const recargar = useCallback(async () => {
    setCargando(true);
    try {
      const [metodos, monedasData] = await Promise.all([
        listarMetodosPago({ pagina, limite }),
        listarMonedasParaSelect(),
      ]);
      setDatos(metodos.items);
      setTotal(metodos.total);
      setMonedas(monedasData);
    } catch (err) {
      onError(mensajeError(err, 'métodos de pago'));
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
            + Nuevo método
          </Boton>
        )}
      </div>

      <TablaDatos
        columnas={columnasMetodosPago}
        datos={datos}
        cargando={cargando}
        mensajeVacio="No hay métodos de pago registrados."
        idFila={(m) => m.id}
        onFilaClick={puedeEditar ? (m) => { setMetodoActivo(m); setPanelEditarAbierto(true); } : undefined}
        accionesFila={
          hayAcciones
            ? (m) => (
                <>
                  {puedeEditar && (
                    <BotonAccionTabla
                      accion="editar"
                      onClick={(e) => { e.stopPropagation(); setMetodoActivo(m); setPanelEditarAbierto(true); }}
                    />
                  )}
                  {puedeBorrar && (
                    <BotonAccionTabla
                      accion="eliminar"
                      onClick={(e) => { e.stopPropagation(); setMetodoAEliminar(m); }}
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

      <PanelCrearMetodoPago
        abierto={panelCrearAbierto}
        monedas={monedas}
        onCerrar={() => setPanelCrearAbierto(false)}
        onExito={onExito}
        onError={onError}
        onRecargar={recargar}
      />

      <PanelEditarMetodoPago
        abierto={panelEditarAbierto}
        metodoPago={metodoActivo}
        monedas={monedas}
        onCerrar={() => { setPanelEditarAbierto(false); setMetodoActivo(null); }}
        onExito={onExito}
        onError={onError}
        onRecargar={recargar}
      />

      <ModalEliminarMetodoPago
        abierto={Boolean(metodoAEliminar)}
        metodoPago={metodoAEliminar}
        onCerrar={() => setMetodoAEliminar(null)}
        onExito={onExito}
        onError={onError}
        onRecargar={recargar}
        onCerrarEdicion={() => {
          if (metodoActivo?.id === metodoAEliminar?.id) {
            setPanelEditarAbierto(false);
            setMetodoActivo(null);
          }
        }}
      />
    </>
  );
}
