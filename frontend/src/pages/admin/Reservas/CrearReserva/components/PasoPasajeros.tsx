import { useState, useEffect, useRef } from 'react';
import Boton from '../../../../../components/ui/Boton/Boton';
import Entrada from '../../../../../components/ui/Entrada/Entrada';
import SelectorPuntoRecogidaReserva from '../../../../../components/puntos-recogida/SelectorPuntoRecogidaReserva';
import DomicilioRecogidaAcompanante, {
  type ValorDomicilioAcompanante,
} from '../../../../../components/puntos-recogida/DomicilioRecogidaAcompanante';
import '../../../../../components/puntos-recogida/puntos-recogida.css';
import { listarClientesParaSelect, listarPuntosRecogidaCliente } from '../../../../../services/clientes';
import type { PasajeroDraft } from '../../../../../types/reservas';
import type { Cliente } from '../../../../../types/cliente';
import type { PuntoRecogida } from '../../../../../types/puntoRecogida';
import { validarPasajerosReserva } from '../../../../../utils/validacionesFormulario';

// ─── SelectBuscador ──────────────────────────────────────────────

interface Opcion {
  valor: number;
  etiqueta: string;
}

function SelectBuscador({
  opciones,
  valorSeleccionado,
  onSeleccionar,
  placeholder = '— Seleccionar —',
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
    ? opciones.filter((o) => o.etiqueta.toLowerCase().includes(termino))
    : opciones;

  const seleccionar = (op: Opcion) => {
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
    <div
      className="sb"
      ref={contenedorRef}
      style={deshabilitado ? { opacity: 0.45, pointerEvents: 'none' } : undefined}
    >
      <div className="sb__control" onClick={() => setAbierto(true)}>
        <input
          className="sb__input"
          value={abierto ? busqueda : (opcionActual?.etiqueta ?? '')}
          placeholder={placeholder}
          onChange={(e) => { setBusqueda(e.target.value); setAbierto(true); }}
          onFocus={() => setAbierto(true)}
          readOnly={!abierto}
        />
        {opcionActual && !abierto && (
          <button type="button" className="sb__clear" onClick={limpiar} tabIndex={-1}>✕</button>
        )}
        <span className="sb__chevron" style={{ transform: abierto ? 'rotate(180deg)' : undefined }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </div>

      {abierto && (
        <div className="sb__menu">
          {opcionesFiltradas.length === 0 ? (
            <div className="sb__empty">Sin resultados para "{busqueda}"</div>
          ) : (
            opcionesFiltradas.map((op) => (
              <div
                key={op.valor}
                className={`sb__option${op.valor === valorSeleccionado ? ' sb__option--selected' : ''}`}
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

// ─── PasoPasajeros ───────────────────────────────────────────────

interface Props {
  pasajeros: PasajeroDraft[];
  setPasajeros: (p: PasajeroDraft[]) => void;
  precioBase: number;
  titularClienteId: number;
  titularPuntoRecogidaId: number | undefined;
  setTitularPuntoRecogidaId: (id: number | undefined) => void;
  onSiguiente: () => void;
  onAtras: () => void;
}

export default function PasoPasajeros({
  pasajeros,
  setPasajeros,
  precioBase,
  titularClienteId,
  titularPuntoRecogidaId,
  setTitularPuntoRecogidaId,
  onSiguiente,
  onAtras,
}: Props) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [domiciliosTitular, setDomiciliosTitular] = useState<PuntoRecogida[]>([]);
  const [cargandoDomiciliosTitular, setCargandoDomiciliosTitular] = useState(true);
  const [domiciliosPorCliente, setDomiciliosPorCliente] = useState<Record<number, PuntoRecogida[]>>({});
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);

  useEffect(() => {
    listarClientesParaSelect().then(setClientes).catch(() => {});
  }, []);

  useEffect(() => {
    setCargandoDomiciliosTitular(true);
    listarPuntosRecogidaCliente(titularClienteId)
      .then((lista) => {
        setDomiciliosTitular(lista);
        const pred = lista.find((d) => d.es_predeterminado)?.id;
        if (pred) setTitularPuntoRecogidaId(pred);
      })
      .catch(() => setDomiciliosTitular([]))
      .finally(() => setCargandoDomiciliosTitular(false));
  }, [titularClienteId, setTitularPuntoRecogidaId]);

  const cargarDomiciliosCliente = (clienteId: number, domiciliosIniciales?: PuntoRecogida[]) => {
    if (domiciliosIniciales?.length) {
      setDomiciliosPorCliente((prev) => ({ ...prev, [clienteId]: domiciliosIniciales }));
      return;
    }
    if (!clienteId || domiciliosPorCliente[clienteId]) return;
    listarPuntosRecogidaCliente(clienteId)
      .then((lista) => setDomiciliosPorCliente((prev) => ({ ...prev, [clienteId]: lista })))
      .catch(() => setDomiciliosPorCliente((prev) => ({ ...prev, [clienteId]: [] })));
  };

  // Clientes ya añadidos como pasajeros (para no repetirlos en el selector)
  const clientesYaAgregados = new Set(pasajeros.map((p) => p.cliente_id));

  const opcionesClientes: Opcion[] = clientes
    .filter((c) => !clientesYaAgregados.has(c.id))
    .map((c) => ({
      valor: c.id,
      etiqueta: `${c.nombre} ${c.apellido} — ${c.tipo_documento}-${c.numero_documento}`,
    }));

  const agregarPasajeroVacio = () => {
    // Solo agrega un slot vacío; el usuario luego selecciona el cliente
    setPasajeros([
      ...pasajeros,
      {
        id_temporal: Date.now(),
        cliente_id: 0,
        nombre: '',
        apellido: '',
        numero_documento: '',
        tipo_documento: '',
        es_menor: false,
        ocupa_asiento: true,
        precio_pasajero_eur: precioBase,
        recargo_eur: 0,
        notas_tarifa: '',
        punto_recogida_id: undefined,
        puntos_recogida: undefined,
      },
    ]);
  };

  const seleccionarCliente = (id_temporal: number, opcion: Opcion | null) => {
    if (!opcion) {
      setPasajeros(
        pasajeros.map((p) =>
          p.id_temporal === id_temporal
            ? {
                ...p,
                cliente_id: 0,
                nombre: '',
                apellido: '',
                numero_documento: '',
                tipo_documento: '',
                punto_recogida_id: undefined,
                puntos_recogida: undefined,
              }
            : p
        )
      );
      return;
    }
    const cliente = clientes.find((c) => c.id === opcion.valor);
    if (!cliente) return;
    const domiciliosCliente = cliente.puntos_recogida ?? [];
    const predeterminado =
      domiciliosCliente.find((d) => d.es_predeterminado)?.id ?? domiciliosCliente[0]?.id;
    setPasajeros(
      pasajeros.map((p) =>
        p.id_temporal === id_temporal
          ? {
              ...p,
              cliente_id: cliente.id,
              nombre: cliente.nombre,
              apellido: cliente.apellido,
              numero_documento: cliente.numero_documento,
              tipo_documento: cliente.tipo_documento,
              punto_recogida_id: predeterminado,
              puntos_recogida: undefined,
            }
          : p
      )
    );
    cargarDomiciliosCliente(cliente.id, domiciliosCliente.length ? domiciliosCliente : undefined);
  };

  const actualizarDomicilio = (id_temporal: number, valor: ValorDomicilioAcompanante) => {
    setPasajeros(
      pasajeros.map((p) =>
        p.id_temporal === id_temporal
          ? {
              ...p,
              punto_recogida_id: valor.punto_recogida_id ?? undefined,
              puntos_recogida: valor.puntos_recogida ?? undefined,
            }
          : p,
      ),
    );
  };

  const actualizarCampo = (
    id_temporal: number,
    campo: keyof PasajeroDraft,
    valor: string | number | boolean | undefined | null,
  ) => {
    setPasajeros(pasajeros.map((p) => (p.id_temporal === id_temporal ? { ...p, [campo]: valor } : p)));
  };

  const eliminarPasajero = (id_temporal: number) => {
    setPasajeros(pasajeros.filter((p) => p.id_temporal !== id_temporal));
  };

  const puedeAvanzar = pasajeros.every((p) => p.cliente_id > 0);

  const intentarSiguiente = () => {
    const error = validarPasajerosReserva(
      pasajeros,
      titularPuntoRecogidaId,
      domiciliosTitular.length > 0,
    );
    if (error) {
      setErrorValidacion(error);
      return;
    }

    for (let i = 0; i < pasajeros.length; i += 1) {
      const p = pasajeros[i];
      if (!p.punto_recogida_id && !p.puntos_recogida) {
        const domicilios = domiciliosPorCliente[p.cliente_id] ?? [];
        setErrorValidacion(
          domicilios.length > 0
            ? `Selecciona el domicilio del acompañante ${i + 1}.`
            : `Registra el domicilio de recogida del acompañante ${i + 1}.`,
        );
        return;
      }
    }

    setErrorValidacion(null);
    onSiguiente();
  };

  return (
    <div className="step-content">
      {errorValidacion && (
        <div className="crear-reserva-admin__error" role="alert">
          {errorValidacion}
        </div>
      )}
      <div className="paso-header">
        <div className="paso-header__info">
          <span className="paso-seccion-label">Paso 2 de 4</span>
          <h2 className="paso-titulo">Manifiesto de pasajeros</h2>
          <p className="paso-subtitulo" style={{ marginTop: 4, fontSize: '0.85rem', color: 'var(--color-texto-secundario)' }}>
            Todos los acompañantes deben estar registrados como clientes.
            Si un pasajero no aparece en la lista, créalo primero en <strong>Clientes</strong>.
          </p>
        </div>
        <Boton variante="fantasma" tamano="sm" onClick={agregarPasajeroVacio}>
          + Añadir acompañante
        </Boton>
      </div>

      {/* ── Punto de recogida del titular ── */}
      <div className="pasajero-card pasajero-card--titular">
        <div className="pasajero-card__cabecera">
          <span className="pasajero-card__badge pasajero-card__badge--titular">Titular</span>
          <span className="pasajero-card__subtitle">Domicilio de recogida del cliente principal</span>
        </div>
        <div className="campo-grupo">
          <SelectorPuntoRecogidaReserva
            domicilios={domiciliosTitular}
            cargando={cargandoDomiciliosTitular}
            value={titularPuntoRecogidaId ?? null}
            onChange={(id) => setTitularPuntoRecogidaId(id ?? undefined)}
            label="Domicilio de recogida"
            requerido={domiciliosTitular.some((d) => !d.es_predeterminado) || domiciliosTitular.length > 1}
            sinDomiciliosMensaje="El cliente no tiene domicilios registrados. Agrégalos en Clientes antes de continuar."
          />
        </div>
      </div>

      {/* ── Acompañantes ── */}
      {pasajeros.map((p, i) => (
        <div key={p.id_temporal} className="pasajero-card">
          <div className="pasajero-card__cabecera">
            <span className="pasajero-card__badge">Acompañante {i + 1}</span>
            <button
              type="button"
              className="pasajero-card__eliminar"
              onClick={() => eliminarPasajero(p.id_temporal)}
              aria-label="Eliminar acompañante"
            >
              &times;
            </button>
          </div>

          {/* Buscador de cliente */}
          <div className="campo-grupo" style={{ marginBottom: 12 }}>
            <label className="campo-label">Buscar cliente <span style={{ color: 'var(--color-error)' }}>*</span></label>
            <SelectBuscador
              opciones={opcionesClientes}
              valorSeleccionado={p.cliente_id || null}
              onSeleccionar={(op) => seleccionarCliente(p.id_temporal, op)}
              placeholder="Buscar por nombre o documento..."
            />
            {p.cliente_id === 0 && (
              <p className="campo-aviso" style={{ marginTop: 4, color: 'var(--color-advertencia)' }}>
                Selecciona un cliente de la lista. Si no existe, ve a <strong>Clientes → Nuevo cliente</strong>.
              </p>
            )}
          </div>

          {/* Info del cliente seleccionado (solo lectura) */}
          {p.cliente_id > 0 && (
            <div
              className="pasajero-card__grid"
              style={{
                background: 'var(--color-fondo-suave, #f5f7fa)',
                borderRadius: 6,
                padding: '8px 12px',
                marginBottom: 12,
                fontSize: '0.875rem',
                color: 'var(--color-texto-secundario)',
              }}
            >
              <span><strong>Nombre:</strong> {p.nombre} {p.apellido}</span>
              <span><strong>Documento:</strong> {p.tipo_documento}-{p.numero_documento}</span>
            </div>
          )}

          <div className="pasajero-card__grid">
            <div className="campo-grupo" style={{ gridColumn: '1 / -1' }}>
              {p.cliente_id > 0 && (
                <DomicilioRecogidaAcompanante
                  idPrefix={`admin-pasajero-${p.id_temporal}`}
                  domicilios={domiciliosPorCliente[p.cliente_id] ?? []}
                  cargandoDomicilios={p.cliente_id > 0 && !domiciliosPorCliente[p.cliente_id]}
                  value={{
                    punto_recogida_id: p.punto_recogida_id ?? null,
                    puntos_recogida: p.puntos_recogida ?? null,
                  }}
                  onChange={(valor) => actualizarDomicilio(p.id_temporal, valor)}
                />
              )}
            </div>

            {/* Precio */}
            <div className="campo-grupo">
              <label className="campo-label">Precio (€)</label>
              <Entrada
                etiqueta=""
                type="number"
                value={String(p.precio_pasajero_eur)}
                onChange={(e) =>
                  actualizarCampo(p.id_temporal, 'precio_pasajero_eur', parseFloat(e.target.value) || 0)
                }
              />
            </div>

            {/* Recargo */}
            <div className="campo-grupo">
              <label className="campo-label">Recargo (€)</label>
              <Entrada
                etiqueta=""
                type="number"
                value={String(p.recargo_eur)}
                onChange={(e) =>
                  actualizarCampo(p.id_temporal, 'recargo_eur', parseFloat(e.target.value) || 0)
                }
              />
            </div>
          </div>

          {/* Menor / ocupa asiento */}
          <div style={{ display: 'flex', gap: 20, marginTop: 8 }}>
            <label className="campo-checkbox">
              <input
                type="checkbox"
                checked={p.es_menor}
                onChange={(e) => actualizarCampo(p.id_temporal, 'es_menor', e.target.checked)}
              />
              Es menor de edad (niño en brazos / no elige asiento)
            </label>
            <label className="campo-checkbox">
              <input
                type="checkbox"
                checked={p.ocupa_asiento !== false}
                onChange={(e) => actualizarCampo(p.id_temporal, 'ocupa_asiento', e.target.checked)}
              />
              Ocupa asiento
            </label>
          </div>
        </div>
      ))}

      {pasajeros.length === 0 && (
        <div className="paso-vacio">
          Solo viajará el cliente titular. Usa "+ Añadir acompañante" si hay más personas en el grupo.
        </div>
      )}

      <div className="crear-reserva-admin__actions">
        <Boton variante="secundario" onClick={onAtras}>
          Atrás
        </Boton>
        <Boton variante="primario" disabled={!puedeAvanzar} onClick={intentarSiguiente}>
          Siguiente
        </Boton>
      </div>
    </div>
  );
}
