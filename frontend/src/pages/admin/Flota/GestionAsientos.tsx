import { useEffect, useState } from 'react';
import { ModalConfirmacion, PanelDeslizable } from '../../../components/admin';
import CroquisUnidad from '../../../components/croquis/CroquisUnidad';
import type { ModoEdicionCroquis } from '../../../components/croquis/CroquisUnidad';
import Boton from '../../../components/ui/Boton/Boton';
import {
  actualizarAsiento,
  actualizarCroquisUnidad,
  aplicarPlantillaCroquis,
  crearAsiento,
  eliminarAsiento,
  obtenerAsientos,
} from '../../../services/asientos';
import { obtenerUnidad } from '../../../services/unidades';
import type { Asiento } from '../../../types/asiento';
import type { CroquisUnidadDatos, UnidadTransporte } from '../../../types/unidad';
import { celdaEspecialEn, resolverLayoutCroquis, sugerirNumeroAsiento } from '../../../utils/croquis';
import { sanitizarNumeroAsiento, validarFormularioAsiento } from '../../../utils/validacionesFormulario';

interface GestionAsientosProps {
  abierto: boolean;
  onCerrar: () => void;
  unidad: UnidadTransporte | null;
}

const CROQUIS_VACIO: CroquisUnidadDatos = { filas: 9, columnas: 5, celdas: [] };

function posicionPorColumna(columna: number, columnas: number): 'ventana' | 'pasillo' | 'medio' | 'otro' {
  if (columna === 0 || columna === columnas - 1) return 'ventana';
  if (columna === Math.floor(columnas / 2)) return 'medio';
  return 'pasillo';
}

export default function GestionAsientos({ abierto, onCerrar, unidad }: GestionAsientosProps) {
  const [asientos, setAsientos] = useState<Asiento[]>([]);
  const [croquis, setCroquis] = useState<CroquisUnidadDatos>(CROQUIS_VACIO);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modo, setModo] = useState<ModoEdicionCroquis>('asiento');
  const [capacidad, setCapacidad] = useState(unidad?.capacidad ?? 0);

  const [nuevoNum, setNuevoNum] = useState('');
  const [nuevaPos, setNuevaPos] = useState<'ventana' | 'pasillo' | 'medio' | 'otro'>('otro');
  const [nuevaFila, setNuevaFila] = useState<number | null>(null);
  const [nuevaColumna, setNuevaColumna] = useState<number | null>(null);
  const [formularioNuevo, setFormularioNuevo] = useState(false);

  const [confirmacion, setConfirmacion] = useState<null | { tipo: 'asiento' | 'croquis'; id?: number; mensaje: string }>(null);
  const [asientoEditando, setAsientoEditando] = useState<Asiento | null>(null);
  const [editNum, setEditNum] = useState('');
  const [editPos, setEditPos] = useState<'ventana' | 'pasillo' | 'medio' | 'otro'>('otro');

  const cargarAsientos = async () => {
    if (!unidad) return;
    setCargando(true);
    setError(null);
    try {
      const [data, unidadActual] = await Promise.all([
        obtenerAsientos({ unidad_id: unidad.id }),
        obtenerUnidad(unidad.id),
      ]);
      setAsientos(data);
      setCroquis(unidadActual.croquis?.filas ? unidadActual.croquis : CROQUIS_VACIO);
      setCapacidad(unidadActual.capacidad);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar los asientos');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (abierto && unidad) {
      cargarAsientos();
      setNuevoNum('');
      setNuevaPos('otro');
      setFormularioNuevo(false);
      setAsientoEditando(null);
      setModo('asiento');
      setError(null);
    }
  }, [abierto, unidad]);

  const guardarCroquis = async (siguiente: CroquisUnidadDatos) => {
    if (!unidad) return;
    const actualizado = await actualizarCroquisUnidad(unidad.id, {
      filas: siguiente.filas ?? 9,
      columnas: siguiente.columnas ?? 5,
      celdas: siguiente.celdas ?? [],
    });
    setCroquis(actualizado.croquis);
  };

  const abrirAltaEnCelda = (fila: number, columna: number) => {
    setNuevaFila(fila);
    setNuevaColumna(columna);
    setNuevoNum(sugerirNumeroAsiento(asientos.map((a) => a.numero)));
    setNuevaPos(posicionPorColumna(columna, croquis.columnas ?? 5));
    setFormularioNuevo(true);
    setError(null);
  };

  const agregarAsiento = async () => {
    if (!unidad) return;
    const errorAsiento = validarFormularioAsiento(nuevoNum, nuevaPos);
    if (errorAsiento) {
      setError(errorAsiento);
      return;
    }
    setCargando(true);
    setError(null);
    try {
      await crearAsiento({
        unidad_id: unidad.id,
        numero: nuevoNum,
        posicion: nuevaPos,
        fila: nuevaFila,
        columna: nuevaColumna,
      });
      setNuevoNum('');
      setFormularioNuevo(false);
      await cargarAsientos();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al agregar asiento');
      setCargando(false);
    }
  };

  const abrirModalEditar = (asiento: Asiento) => {
    setAsientoEditando(asiento);
    setEditNum(asiento.numero);
    setEditPos(asiento.posicion);
  };

  const cerrarModalEditar = () => {
    setAsientoEditando(null);
  };

  const guardarEdicionAsiento = async () => {
    if (!asientoEditando) return;
    const errorAsiento = validarFormularioAsiento(editNum, editPos);
    if (errorAsiento) {
      setError(errorAsiento);
      return;
    }
    setCargando(true);
    try {
      await actualizarAsiento(asientoEditando.id, {
        numero: editNum,
        posicion: editPos,
      });
      await cargarAsientos();
      cerrarModalEditar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al actualizar asiento');
      setCargando(false);
    }
  };

  const quitarAsiento = (id: number) => {
    setConfirmacion({
      tipo: 'asiento',
      id,
      mensaje: '¿Seguro que deseas eliminar este asiento? Las reservas futuras asignadas a este asiento podrían verse afectadas.',
    });
  };

  const confirmarQuitarAsiento = async (id: number) => {
    setCargando(true);
    try {
      await eliminarAsiento(id);
      await cargarAsientos();
      if (asientoEditando?.id === id) cerrarModalEditar();
      setConfirmacion(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al eliminar asiento');
    } finally {
      setCargando(false);
    }
  };

  const confirmarAccionPendiente = async () => {
    if (confirmacion?.tipo === 'asiento' && confirmacion.id != null) {
      await confirmarQuitarAsiento(confirmacion.id);
      return;
    }
    if (confirmacion?.tipo === 'croquis') {
      await confirmarCroquisTravel();
      setConfirmacion(null);
    }
  };

  const aplicarCroquisTravel = () => {
    if (!unidad) return;
    const aviso = asientos.length > 0
      ? 'Esto reemplazará el mapa actual por el croquis Travel BQTO (A-0, A-00 y A-01 a A-31). ¿Continuar?'
      : 'Se cargará el croquis más usado de Travel BQTO (33 asientos). ¿Continuar?';
    setConfirmacion({ tipo: 'croquis', mensaje: aviso });
  };

  const confirmarCroquisTravel = async () => {
    if (!unidad) return;
    setCargando(true);
    setError(null);
    try {
      const resultado = await aplicarPlantillaCroquis(unidad.id);
      setAsientos(resultado.asientos);
      setCroquis(resultado.croquis);
      setCapacidad(Math.max(capacidad, resultado.total_asientos));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo aplicar el croquis');
    } finally {
      setCargando(false);
    }
  };

  const cambiarDimension = async (campo: 'filas' | 'columnas', delta: number) => {
    const actual = {
      filas: croquis.filas ?? 9,
      columnas: croquis.columnas ?? 5,
      celdas: croquis.celdas ?? [],
    };
    const siguiente = {
      ...actual,
      [campo]: Math.min(campo === 'filas' ? 15 : 7, Math.max(1, actual[campo] + delta)),
    };
    const layout = resolverLayoutCroquis(asientos, siguiente);
    const maxFilaOcupada = Math.max(
      layout.asientos.reduce((m, a) => Math.max(m, a.fila), -1),
      (siguiente.celdas ?? []).reduce((m, c) => Math.max(m, c.fila), -1),
    );
    const maxColOcupada = Math.max(
      layout.asientos.reduce((m, a) => Math.max(m, a.columna), -1),
      (siguiente.celdas ?? []).reduce((m, c) => Math.max(m, c.columna), -1),
    );
    if (delta < 0 && (siguiente.filas <= maxFilaOcupada || siguiente.columnas <= maxColOcupada)) {
      setError('No puedes reducir el croquis mientras haya asientos o celdas en el borde. Muévelos o elimínalos primero.');
      return;
    }
    setCargando(true);
    setError(null);
    try {
      await guardarCroquis(siguiente);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo actualizar el tamaño del croquis');
    } finally {
      setCargando(false);
    }
  };

  const manejarClickAsiento = async (asiento: Asiento) => {
    if (modo === 'vaciar') {
      await quitarAsiento(asiento.id);
      return;
    }
    abrirModalEditar(asiento);
  };

  const manejarClickCelda = async (fila: number, columna: number) => {
    const especial = celdaEspecialEn(croquis.celdas, fila, columna);
    if (modo === 'asiento') {
      if (especial) {
        setError('Quita primero el conductor o la puerta de esa celda.');
        return;
      }
      abrirAltaEnCelda(fila, columna);
      return;
    }

    setCargando(true);
    setError(null);
    try {
      let celdas = [...(croquis.celdas ?? [])].filter((c) => !(c.fila === fila && c.columna === columna));
      if (modo === 'conductor' || modo === 'puerta') {
        celdas = celdas.filter((c) => (modo === 'conductor' ? c.tipo !== 'conductor' : true));
        celdas.push({ fila, columna, tipo: modo });
      }
      await guardarCroquis({
        filas: croquis.filas ?? 9,
        columnas: croquis.columnas ?? 5,
        celdas,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo actualizar la celda');
    } finally {
      setCargando(false);
    }
  };

  const layout = resolverLayoutCroquis(asientos, croquis);

  return (
    <>
      <PanelDeslizable
        abierto={abierto}
        onCerrar={onCerrar}
        ancho="xl"
        titulo={`Croquis: ${unidad?.placa || ''}`}
        subtitulo="Personaliza el mapa de asientos de la unidad. El frente del bus queda abajo, como en el croquis impreso."
        pie={
          <Boton variante="secundario" tamano="sm" onClick={onCerrar}>
            Cerrar
          </Boton>
        }
      >
        <div className="gestion-asientos">
          {error && (
            <div className="flota__error" role="alert">
              {error}
            </div>
          )}

          <div className="gestion-asientos__guia">
            <div className="gestion-asientos__guia-titulo">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              Croquis personalizable
            </div>
            <p className="gestion-asientos__guia-texto">
              Aplica el croquis Travel BQTO (A-0 a A-31) o arma el tuyo: coloca asientos, conductor y puerta.
              Los clientes verán este mismo mapa al reservar.
            </p>
          </div>

          <div className="gestion-asientos__info">
            <div className="gestion-asientos__info-item">
              <span>Modelo</span>
              <strong>{unidad?.modelo || '—'}</strong>
            </div>
            <div className="gestion-asientos__info-item">
              <span>Capacidad máx.</span>
              <strong>{capacidad} pax</strong>
            </div>
            <div className="gestion-asientos__info-item">
              <span>Registrados</span>
              <strong>
                <span style={{ color: asientos.length > capacidad ? 'var(--color-error, #dc2626)' : 'inherit' }}>
                  {asientos.length}
                </span>
              </strong>
            </div>
          </div>

          <div className="gestion-asientos__acciones">
            <Boton
              variante="primario"
              tamano="sm"
              onClick={aplicarCroquisTravel}
              disabled={cargando}
            >
              Usar croquis Travel BQTO
            </Boton>
          </div>

          <div className="gestion-asientos__herramientas">
            <div className="gestion-asientos__modos" role="group" aria-label="Herramienta del croquis">
              {([
                ['asiento', 'Asiento'],
                ['conductor', 'Conductor'],
                ['puerta', 'Puerta'],
                ['vaciar', 'Quitar'],
              ] as const).map(([valor, etiqueta]) => (
                <button
                  key={valor}
                  type="button"
                  className={`gestion-asientos__modo${modo === valor ? ' gestion-asientos__modo--activo' : ''}`}
                  onClick={() => setModo(valor)}
                >
                  {etiqueta}
                </button>
              ))}
            </div>
            <div className="gestion-asientos__dimensiones">
              <span>Filas {layout.filas}</span>
              <button type="button" onClick={() => cambiarDimension('filas', -1)} disabled={cargando} aria-label="Quitar fila">−</button>
              <button type="button" onClick={() => cambiarDimension('filas', 1)} disabled={cargando} aria-label="Agregar fila">+</button>
              <span>Columnas {layout.columnas}</span>
              <button type="button" onClick={() => cambiarDimension('columnas', -1)} disabled={cargando} aria-label="Quitar columna">−</button>
              <button type="button" onClick={() => cambiarDimension('columnas', 1)} disabled={cargando} aria-label="Agregar columna">+</button>
            </div>
          </div>

          {cargando && asientos.length === 0 && !unidad ? (
            <p className="drawer-form__intro">Cargando mapa de asientos...</p>
          ) : (
            <div className="gestion-asientos__mapa">
              <CroquisUnidad
                asientos={asientos}
                croquis={croquis}
                editable
                modoEdicion={modo}
                onClickAsiento={(asiento) => {
                  const real = asientos.find((a) => a.id === asiento.id);
                  if (real) void manejarClickAsiento(real);
                }}
                onClickCelda={(fila, columna) => { void manejarClickCelda(fila, columna); }}
              />
            </div>
          )}
        </div>
      </PanelDeslizable>

      {formularioNuevo && (
        <div className="flota-modal__superposicion" onClick={() => setFormularioNuevo(false)} role="presentation">
          <div className="flota-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="flota-modal__header">
              <div>
                <h3 className="flota-modal__titulo">Nuevo asiento</h3>
                <p className="flota-modal__subtitulo">Fila { (nuevaFila ?? 0) + 1 } · Columna { (nuevaColumna ?? 0) + 1 }</p>
              </div>
              <button className="flota-modal__cerrar" onClick={() => setFormularioNuevo(false)} aria-label="Cerrar">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="flota-modal__cuerpo">
              <div className="flota-modal__campo">
                <label className="flota-modal__label">Número de asiento</label>
                <input
                  className="flota-modal__input"
                  type="text"
                  placeholder="Ej: A-01"
                  value={nuevoNum}
                  maxLength={10}
                  onChange={(e) => setNuevoNum(sanitizarNumeroAsiento(e.target.value))}
                />
              </div>
              <div className="flota-modal__campo">
                <label className="flota-modal__label">Posición</label>
                <select
                  className="flota-modal__input"
                  value={nuevaPos}
                  onChange={(e) => setNuevaPos(e.target.value as typeof nuevaPos)}
                >
                  <option value="ventana">Ventana</option>
                  <option value="pasillo">Pasillo</option>
                  <option value="medio">Medio</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
            </div>
            <div className="flota-modal__acciones">
              <Boton variante="secundario" tamano="sm" onClick={() => setFormularioNuevo(false)} disabled={cargando}>
                Cancelar
              </Boton>
              <Boton variante="primario" tamano="sm" onClick={agregarAsiento} disabled={cargando || !nuevoNum.trim()}>
                Añadir al mapa
              </Boton>
            </div>
          </div>
        </div>
      )}

      {asientoEditando && (
        <div className="flota-modal__superposicion" onClick={cerrarModalEditar} role="presentation">
          <div className="flota-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="flota-modal__header">
              <div>
                <h3 className="flota-modal__titulo">Editar Asiento {asientoEditando.numero}</h3>
                <p className="flota-modal__subtitulo">Modifica sus datos o elimínalo de la unidad.</p>
              </div>
              <button className="flota-modal__cerrar" onClick={cerrarModalEditar} aria-label="Cerrar">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="flota-modal__cuerpo">
              <div className="flota-modal__campo">
                <label className="flota-modal__label">Número de asiento</label>
                <input
                  className="flota-modal__input"
                  type="text"
                  value={editNum}
                  maxLength={10}
                  onChange={(e) => setEditNum(sanitizarNumeroAsiento(e.target.value))}
                />
              </div>
              <div className="flota-modal__campo">
                <label className="flota-modal__label">Posición</label>
                <select
                  className="flota-modal__input"
                  value={editPos}
                  onChange={(e) => setEditPos(e.target.value as typeof editPos)}
                >
                  <option value="ventana">Ventana</option>
                  <option value="pasillo">Pasillo</option>
                  <option value="medio">Medio</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
            </div>

            <div className="flota-modal__acciones" style={{ justifyContent: 'space-between' }}>
              <Boton variante="peligro" tamano="sm" onClick={() => quitarAsiento(asientoEditando.id)} disabled={cargando}>
                Eliminar asiento
              </Boton>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Boton variante="secundario" tamano="sm" onClick={cerrarModalEditar} disabled={cargando}>
                  Cancelar
                </Boton>
                <Boton variante="primario" tamano="sm" onClick={guardarEdicionAsiento} disabled={cargando || !editNum.trim()}>
                  Guardar cambios
                </Boton>
              </div>
            </div>
          </div>
        </div>
      )}

      <ModalConfirmacion
        abierto={confirmacion != null}
        titulo={confirmacion?.tipo === 'croquis' ? 'Confirmar croquis' : 'Confirmar eliminación'}
        mensaje={confirmacion?.mensaje ?? ''}
        textoConfirmar={confirmacion?.tipo === 'croquis' ? 'Aplicar croquis' : 'Eliminar asiento'}
        variante="peligro"
        cargando={cargando}
        onConfirmar={() => void confirmarAccionPendiente()}
        onCancelar={() => setConfirmacion(null)}
      />
    </>
  );
}
