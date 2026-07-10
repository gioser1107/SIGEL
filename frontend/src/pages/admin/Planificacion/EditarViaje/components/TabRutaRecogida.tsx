import { useEffect, useState } from 'react';
import Boton from '../../../../../components/ui/Boton/Boton';
import type { CandidatoRutaRecogida } from '../../../../../types/viaje';
import { useRutaRecogida } from '../../hooks/useRutaRecogida';
import {
  nombreViajero,
  textoDomicilio,
  type ParadaRutaLocal,
} from '../../utils/rutaRecogidaUi';

interface TabRutaRecogidaProps {
  viajeId: number;
  fechaSalida: string;
  activo: boolean;
}

const TIPO_ARRASTRE_PENDIENTE = 'pendiente';
const TIPO_ARRASTRE_RUTA = 'ruta';

export default function TabRutaRecogida({ viajeId, fechaSalida, activo }: TabRutaRecogidaProps) {
  const {
    resumen,
    paradas,
    pendientes,
    sinDomicilio,
    cargando,
    guardando,
    error,
    agregarCandidato,
    quitarParada,
    reordenar,
    actualizarParada,
    limpiarRuta,
  } = useRutaRecogida({ viajeId, fechaSalida, activo });

  const [arrastrandoIndice, setArrastrandoIndice] = useState<number | null>(null);
  const [zonaSobre, setZonaSobre] = useState<'pendientes' | 'ruta' | number | null>(null);

  async function soltarEnRuta(indice: number, data: DataTransfer) {
    const tipo = data.getData('tipo');
    if (tipo === TIPO_ARRASTRE_PENDIENTE) {
      const id = Number(data.getData('reservaClienteId'));
      const candidato = pendientes.find((c) => c.reserva_cliente_id === id);
      if (candidato) await agregarCandidato(candidato, indice);
      return;
    }
    if (tipo === TIPO_ARRASTRE_RUTA) {
      const desde = Number(data.getData('indice'));
      if (!Number.isNaN(desde) && desde !== indice) {
        const hacia = indice > desde ? indice - 1 : indice;
        await reordenar(desde, hacia);
      }
    }
  }

  if (cargando) {
    return <p className="ruta-recogida__cargando">Cargando ruta de recogida…</p>;
  }

  return (
    <div className="ruta-recogida">
      {resumen && (
        <div className="ruta-recogida__resumen">
          <span>{resumen.reservas_activas} reservas activas</span>
          <span>{resumen.viajeros_total} viajeros</span>
          <span>{resumen.viajeros_en_ruta} en ruta</span>
          {resumen.viajeros_sin_domicilio > 0 && (
            <span className="ruta-recogida__resumen-alerta">
              {resumen.viajeros_sin_domicilio} sin domicilio
            </span>
          )}
        </div>
      )}

      {error && (
        <div className="ruta-recogida__error" role="alert">
          {error}
        </div>
      )}

      {sinDomicilio.length > 0 && (
        <div className="ruta-recogida__alerta" role="alert">
          <strong>{sinDomicilio.length} viajero(s) sin domicilio</strong>
          <p>No pueden agregarse a la ruta hasta registrar su dirección de recogida:</p>
          <ul>
            {sinDomicilio.map((c) => (
              <li key={c.reserva_cliente_id}>
                {nombreViajero(c.cliente)} · RES-{c.reserva_id}
                {c.es_titular ? ' (titular)' : ''}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="ruta-recogida__paneles">
        <section className="ruta-recogida__panel">
          <header className="ruta-recogida__panel-cabecera">
            <h3>Pendientes</h3>
            <span>{pendientes.length}</span>
          </header>
          <div
            className={`ruta-recogida__lista${zonaSobre === 'pendientes' ? ' ruta-recogida__lista--sobre' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setZonaSobre('pendientes');
            }}
            onDragLeave={() => setZonaSobre(null)}
          >
            {pendientes.length === 0 && (
              <p className="ruta-recogida__vacio">Todos los viajeros con domicilio están en la ruta.</p>
            )}
            {pendientes.map((candidato) => (
              <TarjetaPendiente
                key={candidato.reserva_cliente_id}
                candidato={candidato}
                deshabilitado={guardando}
                onAgregar={() => void agregarCandidato(candidato)}
              />
            ))}
          </div>
        </section>

        <section className="ruta-recogida__panel ruta-recogida__panel--ruta">
          <header className="ruta-recogida__panel-cabecera">
            <h3>Ruta de recogida</h3>
            <div className="ruta-recogida__panel-acciones">
              {guardando && <span className="ruta-recogida__guardando">Guardando…</span>}
              {paradas.length > 0 && (
                <Boton
                  variante="fantasma"
                  tamano="sm"
                  disabled={guardando}
                  onClick={() => void limpiarRuta()}
                >
                  Limpiar ruta
                </Boton>
              )}
            </div>
          </header>

          <div
            className={`ruta-recogida__lista ruta-recogida__lista--ruta${zonaSobre === 'ruta' ? ' ruta-recogida__lista--sobre' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setZonaSobre('ruta');
            }}
            onDragLeave={() => setZonaSobre(null)}
            onDrop={(e) => {
              e.preventDefault();
              setZonaSobre(null);
              void soltarEnRuta(paradas.length, e.dataTransfer);
            }}
          >
            {paradas.length === 0 && (
              <p className="ruta-recogida__vacio ruta-recogida__vacio--drop">
                Arrastra viajeros aquí para armar la ruta.
              </p>
            )}

            {paradas.map((parada, indice) => (
              <TarjetaParadaRuta
                key={parada.reserva_cliente_id}
                parada={parada}
                indice={indice}
                deshabilitado={guardando}
                arrastrando={arrastrandoIndice === indice}
                sobre={zonaSobre === indice}
                onArrastrarInicio={() => setArrastrandoIndice(indice)}
                onArrastrarFin={() => setArrastrandoIndice(null)}
                onSobre={() => setZonaSobre(indice)}
                onFuera={() => setZonaSobre(null)}
                onSoltar={(e) => {
                  setZonaSobre(null);
                  void soltarEnRuta(indice, e.dataTransfer);
                }}
                onQuitar={() => void quitarParada(parada.reserva_cliente_id)}
                onGuardarCampos={(cambios) =>
                  void actualizarParada(parada.reserva_cliente_id, cambios)
                }
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

interface TarjetaPendienteProps {
  candidato: CandidatoRutaRecogida;
  deshabilitado: boolean;
  onAgregar: () => void;
}

function TarjetaPendiente({ candidato, deshabilitado, onAgregar }: TarjetaPendienteProps) {
  return (
    <article
      className="ruta-recogida__tarjeta ruta-recogida__tarjeta--pendiente"
      draggable={!deshabilitado}
      onDragStart={(e) => {
        e.dataTransfer.setData('tipo', TIPO_ARRASTRE_PENDIENTE);
        e.dataTransfer.setData('reservaClienteId', String(candidato.reserva_cliente_id));
        e.dataTransfer.effectAllowed = 'move';
      }}
    >
      <div className="ruta-recogida__tarjeta-cuerpo">
        <strong>{nombreViajero(candidato.cliente)}</strong>
        {candidato.es_titular && <span className="ruta-recogida__badge">Titular</span>}
        <p className="ruta-recogida__direccion">{textoDomicilio(candidato.domicilio)}</p>
        <p className="ruta-recogida__meta">
          RES-{candidato.reserva_id} · {candidato.cliente.telefono || 'Sin teléfono'}
        </p>
      </div>
      <button
        type="button"
        className="ruta-recogida__btn-agregar"
        disabled={deshabilitado}
        onClick={onAgregar}
        title="Agregar a la ruta"
      >
        +
      </button>
    </article>
  );
}

interface TarjetaParadaRutaProps {
  parada: ParadaRutaLocal;
  indice: number;
  deshabilitado: boolean;
  arrastrando: boolean;
  sobre: boolean;
  onArrastrarInicio: () => void;
  onArrastrarFin: () => void;
  onSobre: () => void;
  onFuera: () => void;
  onSoltar: (e: React.DragEvent) => void;
  onQuitar: () => void;
  onGuardarCampos: (cambios: Partial<Pick<ParadaRutaLocal, 'horaLocal' | 'notas'>>) => void;
}

function TarjetaParadaRuta({
  parada,
  indice,
  deshabilitado,
  arrastrando,
  sobre,
  onArrastrarInicio,
  onArrastrarFin,
  onSobre,
  onFuera,
  onSoltar,
  onQuitar,
  onGuardarCampos,
}: TarjetaParadaRutaProps) {
  const [horaLocal, setHoraLocal] = useState(parada.horaLocal);
  const [notas, setNotas] = useState(parada.notas ?? '');

  useEffect(() => {
    setHoraLocal(parada.horaLocal);
    setNotas(parada.notas ?? '');
  }, [parada.horaLocal, parada.notas, parada.reserva_cliente_id]);

  function guardarSiCambio() {
    const horaCambio = horaLocal !== parada.horaLocal;
    const notasCambio = (notas.trim() || null) !== (parada.notas?.trim() || null);
    if (horaCambio || notasCambio) {
      onGuardarCampos({ horaLocal, notas: notas.trim() || null });
    }
  }

  return (
    <article
      className={`ruta-recogida__tarjeta ruta-recogida__tarjeta--ruta${arrastrando ? ' ruta-recogida__tarjeta--arrastrando' : ''}${sobre ? ' ruta-recogida__tarjeta--sobre' : ''}`}
      draggable={!deshabilitado}
      onDragStart={(e) => {
        onArrastrarInicio();
        e.dataTransfer.setData('tipo', TIPO_ARRASTRE_RUTA);
        e.dataTransfer.setData('indice', String(indice));
        e.dataTransfer.effectAllowed = 'move';
      }}
      onDragEnd={onArrastrarFin}
      onDragOver={(e) => {
        e.preventDefault();
        onSobre();
      }}
      onDragLeave={onFuera}
      onDrop={onSoltar}
    >
      <div className="ruta-recogida__orden" aria-hidden="true">
        {indice + 1}
      </div>

      <div className="ruta-recogida__tarjeta-cuerpo">
        <div className="ruta-recogida__tarjeta-titulo">
          <strong>{nombreViajero(parada.cliente)}</strong>
          {parada.es_titular && <span className="ruta-recogida__badge">Titular</span>}
        </div>
        <p className="ruta-recogida__direccion">{textoDomicilio(parada.domicilio)}</p>
        <p className="ruta-recogida__meta">
          RES-{parada.reserva_id} · {parada.cliente.telefono || 'Sin teléfono'}
        </p>

        <div className="ruta-recogida__campos">
          <label className="ruta-recogida__campo">
            <span>Hora programada</span>
            <input
              type="time"
              className="drawer-form__input"
              value={horaLocal}
              disabled={deshabilitado}
              onChange={(e) => setHoraLocal(e.target.value)}
              onBlur={guardarSiCambio}
            />
          </label>
          <label className="ruta-recogida__campo ruta-recogida__campo--notas">
            <span>Notas</span>
            <input
              type="text"
              className="drawer-form__input"
              placeholder="Ej: Portón azul, llamar al llegar"
              value={notas}
              disabled={deshabilitado}
              onChange={(e) => setNotas(e.target.value)}
              onBlur={guardarSiCambio}
            />
          </label>
        </div>
      </div>

      <button
        type="button"
        className="ruta-recogida__btn-quitar"
        disabled={deshabilitado}
        onClick={onQuitar}
        title="Quitar de la ruta"
        aria-label={`Quitar ${nombreViajero(parada.cliente)} de la ruta`}
      >
        ✕
      </button>
    </article>
  );
}
