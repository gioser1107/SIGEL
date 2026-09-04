import { useCallback, useEffect, useRef, useState } from 'react';
import { TablaDatos, BotonAccionTabla, PaginacionTabla } from '../../../../components/admin';
import Boton from '../../../../components/ui/Boton/Boton';
import { usePaginacionListado } from '../../../../hooks/usePaginacionListado';
import { listarMonedasParaSelect } from '../../../../services/monedas';
import { listarTasas, sincronizarTasaBcv } from '../../../../services/tasas';
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
  const [sincronizando, setSincronizando] = useState(false);
  const [filtroMoneda, setFiltroMoneda] = useState('');
  const [hayTasaEurHoy, setHayTasaEurHoy] = useState<boolean | null>(null);
  const [panelCrearAbierto, setPanelCrearAbierto] = useState(false);
  const [panelEditarAbierto, setPanelEditarAbierto] = useState(false);
  const [tasaActiva, setTasaActiva] = useState<TasaCambio | null>(null);
  const [tasaAEliminar, setTasaAEliminar] = useState<TasaCambio | null>(null);
  const autoIntentado = useRef(false);
  const { pagina, setTotal, total, totalPaginas, irPagina, reiniciarPagina, limite } = usePaginacionListado();

  const recargar = useCallback(async () => {
    setCargando(true);
    try {
      const [tasas, monedasData, tasasHoy] = await Promise.all([
        listarTasas({
          ...(filtroMoneda ? { moneda_id: Number(filtroMoneda) } : {}),
          pagina,
          limite,
        }),
        listarMonedasParaSelect(),
        listarTasas({ fecha: fechaHoyIso(), limite: 50 }),
      ]);
      setDatos(tasas.items);
      setTotal(tasas.total);
      setMonedas(monedasData);
      setHayTasaEurHoy(tasasHoy.items.some((t) => t.moneda.codigo === 'EUR'));
    } catch (err) {
      onError(mensajeError(err, 'tasas'));
    } finally {
      setCargando(false);
    }
  }, [filtroMoneda, onError, pagina, limite, setTotal]);

  useEffect(() => {
    if (activo) recargar();
    else {
      autoIntentado.current = false;
      setHayTasaEurHoy(null);
    }
  }, [activo, recargar]);

  useEffect(() => {
    if (!activo || !puedeCrear || hayTasaEurHoy !== false || autoIntentado.current) return;
    autoIntentado.current = true;
    void (async () => {
      try {
        const resultado = await sincronizarTasaBcv(true);
        if (!resultado.omitido) {
          onExito(resultado.mensaje);
          await recargar();
        }
      } catch {
        /* Si el BCV no responde, queda el aviso y la carga manual. */
      }
    })();
  }, [activo, puedeCrear, hayTasaEurHoy, onExito, recargar]);

  async function traerTasaBcv() {
    setSincronizando(true);
    try {
      const resultado = await sincronizarTasaBcv(false);
      onExito(resultado.mensaje);
      await recargar();
    } catch (err) {
      onError(mensajeError(err, 'tasas'));
    } finally {
      setSincronizando(false);
    }
  }

  const hayAcciones = puedeEditar || puedeBorrar;
  if (!activo) return null;

  return (
    <>
      {hayTasaEurHoy === false && (
        <div className="pagos-admin__alerta-aviso" role="status">
          No hay tasa euro de hoy. Puedes traerla del BCV o registrarla a mano.
        </div>
      )}

      <div className="pagos-admin__toolbar">
        {puedeCrear && (
          <>
            <Boton variante="primario" tamano="sm" onClick={() => void traerTasaBcv()} disabled={sincronizando}>
              {sincronizando ? 'Consultando BCV…' : 'Traer tasa BCV'}
            </Boton>
            <Boton variante="secundario" tamano="sm" onClick={() => setPanelCrearAbierto(true)}>
              Registrar a mano
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
        onCerrar={() => setPanelCrearAbierto(false)}
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
