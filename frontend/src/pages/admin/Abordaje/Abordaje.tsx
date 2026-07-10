import { useMemo, useState } from 'react';
import {
  CabeceraModulo,
  PestaniasFiltro,
  ModalConfirmacion,
} from '../../../components/admin';
import type { PestaniaFiltro } from '../../../components/admin';
import Boton from '../../../components/ui/Boton/Boton';
import useAutenticacion from '../../../hooks/useAutenticacion';
import type { PasajeroManifiesto } from '../../../types/abordaje';
import ModalNotasAbordaje from './components/ModalNotasAbordaje';
import PanelEditarAbordaje from './components/PanelEditarAbordaje';
import SelectorViajesAbordaje from './components/SelectorViajesAbordaje';
import TablaManifiestoAbordaje from './components/TablaManifiestoAbordaje';
import TarjetasResumenAbordaje from './components/TarjetasResumenAbordaje';
import {
  ESTADOS_VIAJE_SELECTOR,
  MODULO,
  PESTANIAS_ESTADO_ABORDAJE,
} from './constants';
import { useManifiestoAbordaje } from './hooks/useManifiestoAbordaje';
import { useSelectorViajesAbordaje } from './hooks/useSelectorViajesAbordaje';
import { formatearFechaViaje } from './utils/formatearAbordaje';
import '../Cotizaciones/Cotizaciones.css';
import './Abordaje.css';

type AccionNotas =
  | { tipo: 'individual'; pasajero: PasajeroManifiesto }
  | { tipo: 'lote' }
  | null;

export default function Abordaje() {
  const { puedeCrear, puedeEditar, puedeBorrar } = useAutenticacion();
  const puedeRegistrar = puedeCrear(MODULO);
  const puedeCorregir = puedeEditar(MODULO);
  const puedeAnularRegistro = puedeBorrar(MODULO);

  const [viajeId, setViajeId] = useState<number | null>(null);
  const [soloHoy, setSoloHoy] = useState(true);
  const [estadoViaje, setEstadoViaje] = useState('');
  const [exito, setExito] = useState<string | null>(null);
  const [accionNotas, setAccionNotas] = useState<AccionNotas>(null);
  const [pasajeroEditar, setPasajeroEditar] = useState<PasajeroManifiesto | null>(null);
  const [pasajeroAnular, setPasajeroAnular] = useState<PasajeroManifiesto | null>(null);

  const filtrosViajes = useMemo(
    () => ({ solo_hoy: soloHoy, ...(estadoViaje ? { estado: estadoViaje } : {}) }),
    [soloHoy, estadoViaje],
  );

  const selector = useSelectorViajesAbordaje({ filtros: filtrosViajes });
  const manifiesto = useManifiestoAbordaje(viajeId);

  const pestaniasConContador: PestaniaFiltro[] = PESTANIAS_ESTADO_ABORDAJE.map((p) => ({
    ...p,
    contador:
      p.id === 'todos'
        ? manifiesto.manifiesto?.resumen.total_pasajeros
        : p.id === manifiesto.filtroEstado
          ? manifiesto.pasajerosFiltrados.length
          : undefined,
  }));

  function volverSelector() {
    setViajeId(null);
    setExito(null);
    manifiesto.setError(null);
  }

  async function confirmarAbordadoIndividual(pasajero: PasajeroManifiesto) {
    await manifiesto.marcarPasajero(pasajero, { estado: 'abordado', notas: null });
    setExito(`${pasajero.cliente.nombre} marcado como abordado.`);
  }

  async function confirmarNotas(notas: string) {
    if (!accionNotas) return;
    if (accionNotas.tipo === 'individual') {
      await manifiesto.marcarPasajero(accionNotas.pasajero, {
        estado: 'no_presentado',
        notas: notas || null,
      });
      setExito('Pasajero marcado como no presentado.');
    } else {
      await manifiesto.marcarLote('no_presentado', notas || null);
      setExito('Pasajeros marcados como no presentados.');
    }
    setAccionNotas(null);
  }

  async function guardarEdicion(estado: 'abordado' | 'no_presentado', notas: string) {
    if (!pasajeroEditar?.abordaje) return;
    await manifiesto.corregirAbordaje(pasajeroEditar.abordaje.id, {
      estado,
      notas: notas || null,
    });
    setPasajeroEditar(null);
    setExito('Registro de abordaje actualizado.');
  }

  async function ejecutarAnular() {
    if (!pasajeroAnular?.abordaje) return;
    await manifiesto.revertirAbordaje(pasajeroAnular.abordaje.id);
    setPasajeroAnular(null);
    setExito('Abordaje anulado. El pasajero vuelve a pendiente.');
  }

  if (!viajeId) {
    return (
      <div className="abordaje">
        <CabeceraModulo
          migaja="TravelBqto / Operaciones"
          titulo="Abordaje"
          contador={selector.viajes.length}
          descripcion="Selecciona un viaje para registrar el abordaje de pasajeros."
        />

        <div className="abordaje__filtros-viajes">
          <label className="abordaje__check">
            <input
              type="checkbox"
              checked={soloHoy}
              onChange={(e) => setSoloHoy(e.target.checked)}
            />
            Solo viajes de hoy
          </label>
          <select
            className="drawer-form__input abordaje__select-estado"
            value={estadoViaje}
            onChange={(e) => setEstadoViaje(e.target.value)}
            aria-label="Filtrar por estado del viaje"
          >
            {ESTADOS_VIAJE_SELECTOR.map((e) => (
              <option key={e.id || 'todos'} value={e.id}>{e.etiqueta}</option>
            ))}
          </select>
          <Boton variante="secundario" tamano="sm" onClick={() => selector.recargar()}>
            Actualizar
          </Boton>
        </div>

        {selector.error && <div className="cotizaciones__error" role="alert">{selector.error}</div>}

        <SelectorViajesAbordaje
          viajes={selector.viajes}
          cargando={selector.cargando}
          onSeleccionar={setViajeId}
        />
      </div>
    );
  }

  const viaje = manifiesto.manifiesto?.viaje;

  return (
    <div className="abordaje">
      <CabeceraModulo
        migaja="TravelBqto / Operaciones / Abordaje"
        titulo={viaje?.destino_nombre ?? 'Manifiesto de abordaje'}
        contador={manifiesto.manifiesto?.resumen.total_pasajeros}
        descripcion={
          viaje
            ? `${formatearFechaViaje(viaje.fecha_salida)}${viaje.guia_nombre ? ` · Guía: ${viaje.guia_nombre}` : ''}`
            : 'Cargando manifiesto…'
        }
        acciones={
          <Boton variante="secundario" tamano="sm" onClick={volverSelector}>
            ← Cambiar viaje
          </Boton>
        }
      />

      {manifiesto.manifiesto && (
        <TarjetasResumenAbordaje resumen={manifiesto.manifiesto.resumen} />
      )}

      <PestaniasFiltro
        pestanias={pestaniasConContador}
        activa={manifiesto.filtroEstado}
        onChange={manifiesto.setFiltroEstado}
      />

      <div className="cotizaciones__toolbar">
        <div className="cotizaciones__toolbar-izq">
          <div className="cotizaciones__busqueda">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Buscar pasajero, documento o asiento…"
              value={manifiesto.busqueda}
              onChange={(e) => manifiesto.setBusqueda(e.target.value)}
              aria-label="Buscar en manifiesto"
            />
          </div>
        </div>
        {puedeRegistrar && manifiesto.seleccionados.size > 0 && (
          <div className="abordaje__acciones-lote">
            <span className="abordaje__seleccion-info">
              {manifiesto.seleccionados.size} seleccionado(s)
            </span>
            <Boton
              variante="primario"
              tamano="sm"
              disabled={manifiesto.procesando}
              onClick={() => void manifiesto.marcarLote('abordado')}
            >
              Marcar abordados
            </Boton>
            <Boton
              variante="secundario"
              tamano="sm"
              disabled={manifiesto.procesando}
              onClick={() => setAccionNotas({ tipo: 'lote' })}
            >
              Marcar no presentados
            </Boton>
          </div>
        )}
      </div>

      {manifiesto.error && <div className="cotizaciones__error" role="alert">{manifiesto.error}</div>}
      {exito && <div className="abordaje__exito" role="status">{exito}</div>}

      <TablaManifiestoAbordaje
        pasajeros={manifiesto.pasajerosFiltrados}
        cargando={manifiesto.cargando}
        procesando={manifiesto.procesando}
        seleccionados={manifiesto.seleccionados}
        puedeRegistrar={puedeRegistrar}
        puedeEditar={puedeCorregir}
        puedeAnular={puedeAnularRegistro}
        onSeleccionChange={manifiesto.setSeleccionados}
        onMarcarAbordado={(p) => void confirmarAbordadoIndividual(p)}
        onMarcarNoPresentado={(p) => setAccionNotas({ tipo: 'individual', pasajero: p })}
        onEditar={setPasajeroEditar}
        onAnular={setPasajeroAnular}
      />

      <ModalNotasAbordaje
        abierto={accionNotas !== null}
        titulo="Marcar no presentado"
        mensaje={
          accionNotas?.tipo === 'lote'
            ? `Indica una nota opcional para ${manifiesto.seleccionados.size} pasajero(s).`
            : 'Indica el motivo por el cual el pasajero no abordó.'
        }
        cargando={manifiesto.procesando}
        onConfirmar={(notas) => void confirmarNotas(notas)}
        onCerrar={() => setAccionNotas(null)}
      />

      <PanelEditarAbordaje
        abierto={Boolean(pasajeroEditar)}
        pasajero={pasajeroEditar}
        cargando={manifiesto.procesando}
        onCerrar={() => setPasajeroEditar(null)}
        onGuardar={guardarEdicion}
      />

      <ModalConfirmacion
        abierto={Boolean(pasajeroAnular)}
        titulo="Anular registro de abordaje"
        mensaje="El pasajero volverá al estado pendiente. ¿Deseas continuar?"
        textoConfirmar="Anular abordaje"
        variante="peligro"
        cargando={manifiesto.procesando}
        onConfirmar={() => void ejecutarAnular()}
        onCancelar={() => setPasajeroAnular(null)}
      />
    </div>
  );
}
