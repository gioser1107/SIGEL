import { useState, useRef, useEffect } from 'react';
import Boton from '../../../../../components/ui/Boton/Boton';
import { nombreCompleto } from '../../../../../utils/nombrePersona';
import type { Cliente } from '../../../../../types/cliente';
import type { ViajeDisponibleReserva } from '../../../../../types/reservas';
import {
  detalleViajeDisponible,
  etiquetaViajeDisponible,
  formatearFechaSalidaViaje,
} from '../utils/formatearViajeDisponible';

// ─── SelectBuscador ──────────────────────────────────────────────

interface Opcion {
  valor: number;
  etiqueta: string;
  busqueda?: string;
  titulo?: string;
  deshabilitada?: boolean;
}

function SelectBuscador({
  opciones,
  valorSeleccionado,
  onSeleccionar,
  placeholder = '— Buscar o seleccionar —',
  deshabilitado = false,
}: {
  opciones: Opcion[];
  valorSeleccionado: number | null;
  onSeleccionar: (opcion: Opcion | null) => void;
  placeholder?: string;
  deshabilitado?: boolean;
}) {
  const [busqueda, setBusqueda] = useState('');
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  const opcionActual = opciones.find((o) => o.valor === valorSeleccionado) ?? null;

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false);
        setBusqueda('');
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const termino = busqueda.trim().toLowerCase();
  const opcionesFiltradas = termino
    ? opciones.filter((o) => (o.busqueda ?? o.etiqueta).toLowerCase().includes(termino))
    : opciones;

  const seleccionar = (op: Opcion) => {
    if (op.deshabilitada) return;
    onSeleccionar(op);
    setBusqueda('');
    setAbierto(false);
  };

  const limpiar = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSeleccionar(null);
    setBusqueda('');
    setAbierto(false);
  };

  return (
    <div className={`sb${deshabilitado ? ' sb--disabled' : ''}`} ref={contenedorRef}>
      <div
        className="sb__control"
        onClick={() => {
          if (!deshabilitado) setAbierto(true);
        }}
      >
        <input
          className="sb__input"
          value={abierto ? busqueda : (opcionActual?.etiqueta ?? '')}
          placeholder={placeholder}
          onChange={(e) => {
            if (deshabilitado) return;
            setBusqueda(e.target.value);
            setAbierto(true);
          }}
          onFocus={() => {
            if (!deshabilitado) setAbierto(true);
          }}
          readOnly={!abierto || deshabilitado}
          disabled={deshabilitado}
        />
        {opcionActual && !abierto && !deshabilitado && (
          <button type="button" className="sb__clear" onClick={limpiar} tabIndex={-1}>
            ✕
          </button>
        )}
        <span className="sb__chevron" style={{ transform: abierto ? 'rotate(180deg)' : undefined }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </div>

      {abierto && !deshabilitado && (
        <div className="sb__menu">
          {opcionesFiltradas.length === 0 ? (
            <div className="sb__empty">Sin resultados para &quot;{busqueda}&quot;</div>
          ) : (
            opcionesFiltradas.map((op) => (
              <div
                key={op.valor}
                className={`sb__option${op.valor === valorSeleccionado ? ' sb__option--selected' : ''}${op.deshabilitada ? ' sb__option--disabled' : ''}`}
                title={op.titulo}
                onMouseDown={() => seleccionar(op)}
              >
                {op.etiqueta}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── PasoViajeCliente ────────────────────────────────────────────

interface Props {
  viajes: ViajeDisponibleReserva[];
  clientes: Cliente[];
  viajeSeleccionado: ViajeDisponibleReserva | null;
  clienteSeleccionado: Cliente | null;
  cargandoViajes?: boolean;
  setViajeSeleccionado: (v: ViajeDisponibleReserva | null) => void;
  setClienteSeleccionado: (c: Cliente | null) => void;
  onSiguiente: () => void;
  onCancelar: () => void;
}

export default function PasoViajeCliente({
  viajes,
  clientes,
  viajeSeleccionado,
  clienteSeleccionado,
  cargandoViajes = false,
  setViajeSeleccionado,
  setClienteSeleccionado,
  onSiguiente,
  onCancelar,
}: Props) {
  const sinViajes = !cargandoViajes && viajes.length === 0;

  const opcionesViaje: Opcion[] = viajes.map((v) => ({
    valor: v.id,
    etiqueta: etiquetaViajeDisponible(v),
    titulo: detalleViajeDisponible(v),
    deshabilitada: !v.disponibilidad.disponible_para_reserva,
    busqueda: [
      v.destino_nombre ?? '',
      v.disponibilidad.unidad_placa ?? '',
      formatearFechaSalidaViaje(v.fecha_salida),
      String(v.disponibilidad.asientos_disponibles),
    ].join(' '),
  }));

  const opcionesCliente: Opcion[] = clientes.map((c) => ({
    valor: c.cliente_id,
    etiqueta: nombreCompleto(c.nombre, c.apellido),
    busqueda: `${nombreCompleto(c.nombre, c.apellido)} ${c.tipo_documento}-${c.numero_documento}`,
  }));

  const manejarSeleccionViaje = (op: Opcion | null) => {
    if (!op) {
      setViajeSeleccionado(null);
      return;
    }
    setViajeSeleccionado(viajes.find((x) => x.id === op.valor) ?? null);
  };

  const manejarSeleccionCliente = (op: Opcion | null) => {
    if (!op) {
      setClienteSeleccionado(null);
      return;
    }
    setClienteSeleccionado(clientes.find((x) => x.cliente_id === op.valor) ?? null);
  };

  return (
    <div className="step-content">
      <div className="paso-header">
        <div className="paso-header__info">
          <span className="paso-seccion-label">Paso 1 de 4</span>
          <h2 className="paso-titulo">Viaje y cliente</h2>
        </div>
      </div>

      {/* ── Viaje ── */}
      <div className="paso-seccion">
        <span className="paso-seccion__label">Seleccionar viaje</span>
        {cargandoViajes ? (
          <p className="paso-aviso-cliente" role="status">
            Cargando viajes disponibles…
          </p>
        ) : sinViajes ? (
          <p className="paso-aviso-cliente" role="status">
            No hay viajes disponibles para reservar
          </p>
        ) : (
          <SelectBuscador
            opciones={opcionesViaje}
            valorSeleccionado={viajeSeleccionado?.id ?? null}
            onSeleccionar={manejarSeleccionViaje}
            placeholder="Buscar destino, fecha o asientos…"
          />
        )}
        {!cargandoViajes && !sinViajes && (
          <p className="paso-aviso-cliente">
            Los viajes sin cupo o sin asientos en la unidad aparecen en la lista, pero no se pueden seleccionar.
          </p>
        )}

        {viajeSeleccionado && (
          <div className="sb-detalle">
            <div className="sb-detalle__item">
              <span className="sb-detalle__label">Unidad</span>
              <span className="sb-detalle__valor">
                {viajeSeleccionado.disponibilidad.unidad_placa ?? (
                  <em style={{ color: 'var(--color-text-muted)' }}>Sin placa registrada</em>
                )}
              </span>
            </div>
            <div className="sb-detalle__item">
              <span className="sb-detalle__label">Asientos libres</span>
              <span className="sb-detalle__valor">
                {viajeSeleccionado.disponibilidad.asientos_disponibles} de{' '}
                {viajeSeleccionado.disponibilidad.total_asientos}
              </span>
            </div>
            <div className="sb-detalle__item">
              <span className="sb-detalle__label">Precio</span>
              <span className="sb-detalle__valor">
                {viajeSeleccionado.precio_base_eur} € por pasajero
              </span>
            </div>
            <div className="sb-detalle__item">
              <span className="sb-detalle__label">Estado</span>
              <span className={`sb-detalle__badge sb-detalle__badge--${viajeSeleccionado.estado}`}>
                {viajeSeleccionado.estado}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Cliente titular ── */}
      <div className="paso-seccion">
        <span className="paso-seccion__label">Cliente titular</span>

        <SelectBuscador
          opciones={opcionesCliente}
          valorSeleccionado={clienteSeleccionado?.cliente_id ?? null}
          onSeleccionar={manejarSeleccionCliente}
          placeholder="Buscar por nombre o cédula…"
        />

        {clienteSeleccionado && (
          <div className="sb-detalle">
            <div className="sb-detalle__item">
              <span className="sb-detalle__label">Cédula</span>
              <span className="sb-detalle__valor">
                {clienteSeleccionado.tipo_documento}-{clienteSeleccionado.numero_documento}
              </span>
            </div>
            {clienteSeleccionado.telefono && (
              <div className="sb-detalle__item">
                <span className="sb-detalle__label">Teléfono</span>
                <span className="sb-detalle__valor">{clienteSeleccionado.telefono}</span>
              </div>
            )}
          </div>
        )}

        {!clienteSeleccionado && (
          <div className="paso-aviso-cliente">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>
              Si el cliente no aparece en la lista, ve al{' '}
              <strong>módulo de Clientes</strong> para registrarlo primero.
            </span>
          </div>
        )}
      </div>

      <div className="crear-reserva-admin__actions">
        <Boton variante="secundario" onClick={onCancelar}>
          Cancelar
        </Boton>
        <Boton
          variante="primario"
          disabled={!viajeSeleccionado || !clienteSeleccionado || cargandoViajes || sinViajes}
          onClick={onSiguiente}
        >
          Siguiente
        </Boton>
      </div>
    </div>
  );
}
