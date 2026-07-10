import { useCallback, useEffect, useState } from 'react';
import { TablaDatos, BotonAccionTabla, PaginacionTabla } from '../../../../components/admin';
import Boton from '../../../../components/ui/Boton/Boton';
import { usePaginacionListado } from '../../../../hooks/usePaginacionListado';
import { listarMonedasParaSelect } from '../../../../services/monedas';
import { listarTasas } from '../../../../services/tasas';
import type { Moneda, TasaCambio } from '../../../../types/pagos';
import { fechaHoyIso } from '../constants';
import type { PropsSeccionPagos } from '../types';
import { mensajeError } from '../utils/mensajeError';
import PanelCrearTasa from './CrearTasa/PanelCrearTasa';
import PanelEditarTasa from './EditarTasa/PanelEditarTasa';
import ModalEliminarTasa from './EliminarTasa/ModalEliminarTasa';
import { columnasTasas } from './components/columnasTasas';

export default function Tasas({
  activo,
  puedeCrear,
  puedeEditar,
  puedeBorrar,
  onExito,
  onError,
}: PropsSeccionPagos) {
  const [datos, setDatos] = useState<TasaCambio[]>([]);
  const [monedas, setMonedas] = useState<Moneda[]>([]);
  const [cargando, setCargando] = useState(false);
  const [filtroMoneda, setFiltroMoneda] = useState('');
  const [panelCrearAbierto, setPanelCrearAbierto] = useState(false);
  const [fechaCrear, setFechaCrear] = useState<string | undefined>(undefined);
  const [panelEditarAbierto, setPanelEditarAbierto] = useState(false);
  const [tasaActiva, setTasaActiva] = useState<TasaCambio | null>(null);
  const [tasaAEliminar, setTasaAEliminar] = useState<TasaCambio | null>(null);
  const { pagina, setTotal, total, totalPaginas, irPagina, reiniciarPagina, limite } = usePaginacionListado();

  const recargar = useCallback(async () => {
    setCargando(true);
    try {
      const [tasas, monedasData] = await Promise.all([
        listarTasas({
          ...(filtroMoneda ? { moneda_id: Number(filtroMoneda) } : {}),
          pagina,
          limite,
        }),
        listarMonedasParaSelect(),
      ]);
      setDatos(tasas.items);
      setTotal(tasas.total);
      setMonedas(monedasData);
    } catch (err) {
      onError(mensajeError(err, 'tasas'));
    } finally {
      setCargando(false);
    }
  }, [filtroMoneda, onError, pagina, limite, setTotal]);

  useEffect(() => {
    if (activo) recargar();
  }, [activo, recargar]);

  function abrirCrear(fecha?: string) {
    setFechaCrear(fecha);
    setPanelCrearAbierto(true);
  }

  const hayAcciones = puedeEditar || puedeBorrar;
  if (!activo) return null;

  return (
    <>
      <div className="pagos-admin__toolbar">
        {puedeCrear && (
          <>
            <Boton variante="primario" tamano="sm" onClick={() => abrirCrear()}>
              + Registrar tasa
            </Boton>
            <Boton variante="secundario" tamano="sm" onClick={() => abrirCrear(fechaHoyIso())}>
              Registrar tasa de hoy
            </Boton>
          </>
        )}
        <select
          className="drawer-form__input pagos-admin__filtro-select"
          value={filtroMoneda}
          onChange={(e) => { setFiltroMoneda(e.target.value); reiniciarPagina(); }}
          aria-label="Filtrar por moneda"
        >
          <option value="">Todas las monedas</option>
          {monedas.map((m) => (
            <option key={m.id} value={m.id}>{m.codigo}</option>
          ))}
        </select>
      </div>

      <TablaDatos
        columnas={columnasTasas}
        datos={datos}
        cargando={cargando}
        mensajeVacio="No hay tasas registradas."
        idFila={(t) => t.id}
        onFilaClick={puedeEditar ? (t) => { setTasaActiva(t); setPanelEditarAbierto(true); } : undefined}
        accionesFila={
          hayAcciones
            ? (t) => (
                <>
                  {puedeEditar && (
                    <BotonAccionTabla
                      accion="editar"
                      onClick={(e) => { e.stopPropagation(); setTasaActiva(t); setPanelEditarAbierto(true); }}
                    />
                  )}
                  {puedeBorrar && (
                    <BotonAccionTabla
                      accion="eliminar"
                      onClick={(e) => { e.stopPropagation(); setTasaAEliminar(t); }}
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

      <PanelCrearTasa
        abierto={panelCrearAbierto}
        monedas={monedas}
        fechaInicial={fechaCrear}
        onCerrar={() => { setPanelCrearAbierto(false); setFechaCrear(undefined); }}
        onExito={onExito}
        onError={onError}
        onRecargar={recargar}
      />

      <PanelEditarTasa
        abierto={panelEditarAbierto}
        tasa={tasaActiva}
        monedas={monedas}
        onCerrar={() => { setPanelEditarAbierto(false); setTasaActiva(null); }}
        onExito={onExito}
        onError={onError}
        onRecargar={recargar}
      />

      <ModalEliminarTasa
        abierto={Boolean(tasaAEliminar)}
        tasa={tasaAEliminar}
        onCerrar={() => setTasaAEliminar(null)}
        onExito={onExito}
        onError={onError}
        onRecargar={recargar}
        onCerrarEdicion={() => {
          if (tasaActiva?.id === tasaAEliminar?.id) {
            setPanelEditarAbierto(false);
            setTasaActiva(null);
          }
        }}
      />
    </>
  );
}
