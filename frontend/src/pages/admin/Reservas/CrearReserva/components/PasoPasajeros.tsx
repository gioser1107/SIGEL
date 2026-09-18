import { useState, useEffect, useRef } from 'react';
import Boton from '../../../../../components/ui/Boton/Boton';
import '../../../../../components/ui/Entrada/Entrada.css';
import DomicilioRecogidaAcompanante, {
  type ValorDomicilioAcompanante,
} from '../../../../../components/puntos-recogida/DomicilioRecogidaAcompanante';
import '../../../../../components/puntos-recogida/puntos-recogida.css';
import '../../../../../components/client/FormularioPasajeros/FormularioPasajeros.css';
import { listarClientesParaSelect, listarPuntosRecogidaCliente } from '../../../../../services/clientes';
import type { PasajeroDraft } from '../../../../../types/reservas';
import type { Cliente } from '../../../../../types/cliente';
import type { PuntoRecogida, PuntoRecogidaInline } from '../../../../../types/puntoRecogida';
import { validarPasajerosReserva } from '../../../../../utils/validacionesFormulario';
import {
  tieneErroresCliente,
  validarFormularioCliente,
  type FormularioCliente,
} from '../../../../../utils/validacionesCliente';
import CampoMonto from '../../../../../components/ui/CampoMonto/CampoMonto';
import { FORM_VACIO } from '../../../Clientes/constants';
import { crearPasajeroVacio } from '../utils/pasajerosGrupo';
import FichaAcompananteNueva from './FichaAcompananteNueva';
import CamposPoliticaMenor from '../../../../../components/client/FormularioPasajeros/CamposPoliticaMenor';
import { errorPoliticaMenor, recargoMenorEstimado, resolverPoliticaMenor } from '../../../../../utils/politicaMenor';

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
  recargoMenorEur: number;
  titularClienteId: number;
  titularPuntoRecogidaId: number | undefined;
  setTitularPuntoRecogidaId: (id: number | undefined) => void;
  titularDomicilioNuevo: PuntoRecogidaInline | undefined;
  setTitularDomicilioNuevo: (domicilio: PuntoRecogidaInline | undefined) => void;
  onSiguiente: () => void;
  onAtras: () => void;
}

export default function PasoPasajeros({
  pasajeros,
  setPasajeros,
  precioBase,
  recargoMenorEur,
  titularClienteId,
  titularPuntoRecogidaId,
  setTitularPuntoRecogidaId,
  titularDomicilioNuevo,
  setTitularDomicilioNuevo,
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
      .then(setDomiciliosTitular)
      .catch(() => setDomiciliosTitular([]))
      .finally(() => setCargandoDomiciliosTitular(false));
  }, [titularClienteId]);

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
    .filter((c) => c.id !== titularClienteId && !clientesYaAgregados.has(c.id))
    .map((c) => ({
      valor: c.id,
      etiqueta: `${c.nombre} ${c.apellido} — ${c.tipo_documento}-${c.numero_documento}`,
    }));

  const agregarPasajeroVacio = () => {
    setPasajeros([...pasajeros, crearPasajeroVacio(precioBase, Date.now())]);
  };

  const cambiarModo = (id_temporal: number, modo: 'existente' | 'nuevo') => {
    setPasajeros(
      pasajeros.map((p) =>
        p.id_temporal === id_temporal
          ? {
              ...p,
              modo,
              cliente_id: 0,
              nombre: '',
              apellido: '',
              numero_documento: '',
              tipo_documento: '',
              ficha: modo === 'nuevo' ? { ...FORM_VACIO } : undefined,
              punto_recogida_id: undefined,
              puntos_recogida: undefined,
            }
          : p,
      ),
    );
  };

  const actualizarFicha = (
    id_temporal: number,
    actualizador: (prev: FormularioCliente) => FormularioCliente,
  ) => {
    setPasajeros(
      pasajeros.map((p) => {
        if (p.id_temporal !== id_temporal) return p;
        const ficha = actualizador(p.ficha ?? { ...FORM_VACIO });
        return {
          ...p,
          ficha,
          nombre: ficha.nombre,
          apellido: ficha.apellido,
          numero_documento: ficha.numero_documento,
          tipo_documento: ficha.tipo_documento,
        };
      }),
    );
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
                modo: 'existente',
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

  const aplicarPoliticaMenor = (
    id_temporal: number,
    parcial: Partial<Pick<PasajeroDraft, 'es_menor' | 'fecha_nacimiento' | 'ocupa_asiento' | 'partida_nacimiento_url'>>,
  ) => {
    setPasajeros(
      pasajeros.map((p) => {
        if (p.id_temporal !== id_temporal) return p;
        const esMenor = parcial.es_menor ?? p.es_menor;
        const fecha = parcial.fecha_nacimiento ?? p.fecha_nacimiento ?? '';
        const politica = resolverPoliticaMenor(esMenor, fecha, parcial.ocupa_asiento ?? p.ocupa_asiento);
        return {
          ...p,
          es_menor: esMenor,
          fecha_nacimiento: esMenor ? fecha : '',
          ocupa_asiento: politica.ocupa_asiento,
          partida_nacimiento_url: esMenor
            ? (parcial.partida_nacimiento_url !== undefined ? parcial.partida_nacimiento_url : p.partida_nacimiento_url)
            : null,
          recargo_eur: recargoMenorEstimado(esMenor, fecha, recargoMenorEur, politica.ocupa_asiento),
        };
      }),
    );
  };

  const eliminarPasajero = (id_temporal: number) => {
    setPasajeros(pasajeros.filter((p) => p.id_temporal !== id_temporal));
  };

  const puedeAvanzar = pasajeros.every((p) =>
    p.modo === 'nuevo' ? Boolean(p.ficha) : p.cliente_id > 0,
  );

  const intentarSiguiente = () => {
    const error = validarPasajerosReserva(
      pasajeros.map((p) => ({
        cliente_id: p.cliente_id,
        precio_pasajero_eur: p.precio_pasajero_eur,
        modo: p.modo ?? 'existente',
        fichaCompleta: p.modo === 'nuevo' ? !tieneErroresCliente(validarFormularioCliente(p.ficha ?? FORM_VACIO, { exigirEmergencia: false })) : true,
      })),
      titularPuntoRecogidaId,
      domiciliosTitular.length > 0,
      Boolean(titularDomicilioNuevo),
    );
    if (error) {
      setErrorValidacion(error);
      return;
    }

    for (let i = 0; i < pasajeros.length; i += 1) {
      const p = pasajeros[i];
      if (p.modo === 'nuevo' && p.ficha) {
        const erroresFicha = validarFormularioCliente(p.ficha, { exigirEmergencia: false });
        if (tieneErroresCliente(erroresFicha)) {
          setErrorValidacion(`Revisa los datos personales del acompañante ${i + 1}.`);
          return;
        }
      }
      if (!p.punto_recogida_id && !p.puntos_recogida) {
        const domicilios = p.cliente_id ? (domiciliosPorCliente[p.cliente_id] ?? []) : [];
        setErrorValidacion(
          domicilios.length > 0
            ? `Selecciona el domicilio del acompañante ${i + 1}.`
            : `Registra el domicilio de recogida del acompañante ${i + 1}.`,
        );
        return;
      }
      const errorMenor = errorPoliticaMenor(
        p.es_menor,
        p.fecha_nacimiento ?? '',
        p.partida_nacimiento_url ?? null,
      );
      if (errorMenor) {
        setErrorValidacion(`Acompañante ${i + 1}: ${errorMenor}`);
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
            {pasajeros.length > 0
              ? `Reserva grupal: titular + ${pasajeros.length} acompañante${pasajeros.length === 1 ? '' : 's'}. Puedes registrar a cada persona aquí, sin crear 10 reservas ni salir a Clientes.`
              : 'Solo viaja el titular. Si es un grupo, pulsa “+ Añadir acompañante” o vuelve al paso 1 y elige Viaje grupal.'}
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
          <span className="pasajero-card__subtitle">
            Elige un domicilio registrado o créalo aquí, sin salir de la reserva
          </span>
        </div>
        <div className="campo-grupo">
          {cargandoDomiciliosTitular ? (
            <p className="pr-selector-reserva__aviso">Cargando domicilios registrados…</p>
          ) : (
            <DomicilioRecogidaAcompanante
              idPrefix="admin-titular"
              domicilios={domiciliosTitular}
              value={{
                punto_recogida_id: titularPuntoRecogidaId ?? null,
                puntos_recogida: titularDomicilioNuevo ?? null,
              }}
              onChange={(valor) => {
                setErrorValidacion(null);
                setTitularPuntoRecogidaId(valor.punto_recogida_id ?? undefined);
                setTitularDomicilioNuevo(valor.puntos_recogida ?? undefined);
              }}
            />
          )}
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

          <div className="pasajero-card__modos" role="group" aria-label="Cómo identificar al acompañante">
            <button
              type="button"
              className={`pasajero-card__modo${p.modo !== 'nuevo' ? ' pasajero-card__modo--activo' : ''}`}
              onClick={() => cambiarModo(p.id_temporal, 'existente')}
            >
              Ya es cliente
            </button>
            <button
              type="button"
              className={`pasajero-card__modo${p.modo === 'nuevo' ? ' pasajero-card__modo--activo' : ''}`}
              onClick={() => cambiarModo(p.id_temporal, 'nuevo')}
            >
              Registrar ahora
            </button>
          </div>

          {p.modo !== 'nuevo' && (
          <>
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
                Busca al cliente o cambia a <strong>Registrar ahora</strong> para cargarlo en esta reserva.
              </p>
            )}
          </div>
          </>
          )}

          {p.modo === 'nuevo' && p.ficha && (
            <div className="pasajero-card__ficha-nueva">
              <FichaAcompananteNueva
                idTemporal={p.id_temporal}
                form={p.ficha}
                errores={errorValidacion ? validarFormularioCliente(p.ficha, { exigirEmergencia: false }) : {}}
                onChange={(actualizador) => actualizarFicha(p.id_temporal, actualizador)}
                onLimpiarError={() => undefined}
              />
            </div>
          )}

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
              {(p.modo === 'nuevo' || p.cliente_id > 0) && (
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
              <div className="grupo-entrada">
                <CampoMonto
                  className="grupo-entrada__campo"
                  value={p.precio_pasajero_eur}
                  onValorNumerico={(n) =>
                    actualizarCampo(p.id_temporal, 'precio_pasajero_eur', n)
                  }
                />
              </div>
            </div>

            {/* Recargo */}
            <div className="campo-grupo">
              <label className="campo-label">Recargo (€)</label>
              <div className="grupo-entrada">
                <CampoMonto
                  className="grupo-entrada__campo"
                  value={p.recargo_eur}
                  onValorNumerico={(n) => actualizarCampo(p.id_temporal, 'recargo_eur', n)}
                />
              </div>
            </div>
          </div>

          {/* Menor / ocupa asiento */}
          <CamposPoliticaMenor
            idPrefijo={`admin-pasajero-${p.id_temporal}`}
            esMenor={p.es_menor}
            fechaNacimiento={p.fecha_nacimiento ?? ''}
            ocupaAsiento={p.ocupa_asiento !== false}
            partidaUrl={p.partida_nacimiento_url ?? null}
            recargoMenorEur={recargoMenorEur}
            onToggleMenor={(esMenor) => aplicarPoliticaMenor(p.id_temporal, { es_menor: esMenor })}
            onFechaNacimiento={(fecha) => aplicarPoliticaMenor(p.id_temporal, { fecha_nacimiento: fecha })}
            onOcupaAsiento={(ocupa) => aplicarPoliticaMenor(p.id_temporal, { ocupa_asiento: ocupa })}
            onPartidaUrl={(url) => aplicarPoliticaMenor(p.id_temporal, { partida_nacimiento_url: url })}
          />
        </div>
      ))}

      {pasajeros.length === 0 && (
        <div className="paso-vacio">
          Solo viajará el cliente titular. Usa “+ Añadir acompañante” o elige Viaje grupal en el paso 1.
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
