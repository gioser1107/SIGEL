import { useState, useEffect, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { CabeceraModulo } from '../../../../components/admin';
import Boton from '../../../../components/ui/Boton/Boton';
import { listarClientesParaSelect } from '../../../../services/clientes';
import {
  crearReserva,
  agregarPasajero,
  asignarAsiento,
  eliminarReserva,
  obtenerViajesDisponiblesReserva,
} from '../../../../services/reservas';
import type { Cliente } from '../../../../types/cliente';
import type { CrearPasajeroDTO, PasajeroDraft, ViajeDisponibleReserva } from '../../../../types/reservas';
import PasoViajeCliente from './components/PasoViajeCliente';
import PasoPasajeros from './components/PasoPasajeros';
import PasoAsientos from './components/PasoAsientos';
import PasoPago from './components/PasoPago';
import './CrearReserva.css';

export default function CrearReserva() {
  const navegar = useNavigate();
  const [paso, setPaso] = useState(1);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Datos globales a cargar
  const [viajes, setViajes] = useState<ViajeDisponibleReserva[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargandoViajes, setCargandoViajes] = useState(true);

  // Datos de la reserva en curso
  const [viajeSeleccionado, setViajeSeleccionado] = useState<ViajeDisponibleReserva | null>(null);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [pasajeros, setPasajeros] = useState<PasajeroDraft[]>([]);
  const [asientosSeleccionados, setAsientosSeleccionados] = useState<number[]>([]);
  const [reservaId, setReservaId] = useState<number | null>(null);
  const [titularPuntoRecogidaId, setTitularPuntoRecogidaId] = useState<number | undefined>();

  async function recargarViajesDisponibles() {
    setCargandoViajes(true);
    try {
      const lista = await obtenerViajesDisponiblesReserva();
      setViajes(lista);
      return lista;
    } finally {
      setCargandoViajes(false);
    }
  }

  useEffect(() => {
    async function cargarInicial() {
      try {
        const [, clientesData] = await Promise.all([
          recargarViajesDisponibles(),
          listarClientesParaSelect(),
        ]);
        setClientes(clientesData);
      } catch (err) {
        setError('Error al cargar datos del sistema.' + err);
      }
    }
    cargarInicial();
  }, []);

  function esErrorViajeNoDisponible(err: unknown): boolean {
    const detalle = err instanceof Error ? err.message : String(err);
    const normalizado = detalle.toLowerCase();
    return (
      normalizado.includes('no esta disponible') ||
      normalizado.includes('no está disponible')
    );
  }

  function mensajeErrorReserva(err: unknown): string {
    const detalle = err instanceof Error ? err.message : String(err);
    if (esErrorViajeNoDisponible(err)) {
      return detalle;
    }
    if (detalle.includes('no existe o está eliminado')) {
      return 'Uno de los asientos seleccionados ya no existe. Regresa al paso de asientos.';
    }
    if (detalle.includes('ya está reservado')) {
      return 'Uno de los asientos ya fue tomado. Elige otros disponibles.';
    }
    return detalle ? `Error: ${detalle}` : 'Ocurrió un error inesperado al procesar la reserva.';
  }

  const puestosOcupados = 1 + pasajeros.filter((p) => p.ocupa_asiento !== false).length;

  async function crearReservaCompleta(asientosIds: number[]): Promise<number> {
    if (reservaId) return reservaId;
    if (!viajeSeleccionado || !clienteSeleccionado) {
      throw new Error('Faltan datos de viaje o cliente.');
    }
    if (asientosIds.length !== puestosOcupados) {
      throw new Error(`Debes seleccionar ${puestosOcupados} asiento(s) correspondiente(s) a los pasajeros que ocupan puesto.`);
    }
    if (asientosIds.some((id) => !id || Number.isNaN(id))) {
      throw new Error('Hay asientos inválidos. Vuelve a seleccionarlos.');
    }

    let reservaIdCreada: number | null = null;

    try {
      const res = await crearReserva({
        cliente_id: clienteSeleccionado.cliente_id,
        viaje_id: viajeSeleccionado.id,
        estado: 'pendiente',
      });
      reservaIdCreada = res.reserva.id;

      const todosLosPasajeros: CrearPasajeroDTO[] = [
        {
          cliente_id: clienteSeleccionado.cliente_id,
          es_menor: false,
          precio_pasajero_eur: viajeSeleccionado.precio_base_eur || 0,
          recargo_eur: 0,
          notas_tarifa: null,
          ocupa_asiento: true,
          punto_recogida_id: titularPuntoRecogidaId,
        },
        ...pasajeros.map((p) => ({
          cliente_id: p.cliente_id,
          es_menor: p.es_menor,
          precio_pasajero_eur: p.precio_pasajero_eur,
          recargo_eur: p.recargo_eur,
          notas_tarifa: p.notas_tarifa || null,
          ocupa_asiento: p.ocupa_asiento ?? true,
          punto_recogida_id: p.punto_recogida_id,
          puntos_recogida: p.puntos_recogida ? [p.puntos_recogida] : undefined,
        })),
      ];

      for (let i = 0; i < todosLosPasajeros.length; i++) {
        const p = todosLosPasajeros[i];
        const resPasajero = await agregarPasajero(reservaIdCreada, {
          cliente_id: p.cliente_id,
          es_menor: p.es_menor,
          precio_pasajero_eur: p.precio_pasajero_eur,
          recargo_eur: p.recargo_eur,
          notas_tarifa: p.notas_tarifa,
          ocupa_asiento: p.ocupa_asiento,
          punto_recogida_id: p.punto_recogida_id,
          puntos_recogida: p.puntos_recogida,
        });

        await asignarAsiento(reservaIdCreada, resPasajero.pasajero_id, {
          asiento_id: asientosIds[i],
        });
      }

      setReservaId(reservaIdCreada);
      return reservaIdCreada;
    } catch (err) {
      if (reservaIdCreada !== null) {
        try {
          await eliminarReserva(reservaIdCreada);
        } catch {
          /* rollback silencioso */
        }
      }
      throw err;
    }
  }

  const manejarPasoAsientosSiguiente = async (asientosIds: number[]) => {
    setAsientosSeleccionados(asientosIds);
    setCargando(true);
    setError(null);
    try {
      await crearReservaCompleta(asientosIds);
      setPaso(4);
    } catch (err) {
      if (esErrorViajeNoDisponible(err)) {
        await recargarViajesDisponibles();
        setViajeSeleccionado(null);
        setPaso(1);
      }
      setError(mensajeErrorReserva(err));
    } finally {
      setCargando(false);
    }
  };

  const manejarGuardarReserva = () => {
    navegar('/admin/reservas');
  };

  return (
    <div className="crear-reserva-admin">
      <CabeceraModulo
        migaja="Reservas / Crear"
        titulo="Registrar nueva reserva"
        descripcion="Flujo manual para registrar reservas por taquilla o teléfono."
        acciones={
          <Boton variante="secundario" onClick={() => navegar('/admin/reservas')}>
            Volver
          </Boton>
        }
      />

      <div className="crear-reserva-admin__stepper">
        {([
          { num: 1, label: 'Viaje y cliente' },
          { num: 2, label: 'Pasajeros' },
          { num: 3, label: 'Asientos' },
          { num: 4, label: 'Pago' },
        ] as const).map((s, i, arr) => (
          <Fragment key={s.num}>
            <div
              className={[
                'stepper-paso',
                paso > s.num ? 'stepper-paso--completado' : '',
                paso === s.num ? 'stepper-paso--activo' : '',
              ].filter(Boolean).join(' ')}
            >
              <div className="stepper-paso__circulo">
                {paso > s.num ? (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  s.num
                )}
              </div>
              <span className="stepper-paso__label">{s.label}</span>
            </div>
            {i < arr.length - 1 && (
              <div className={`stepper-linea${paso > s.num ? ' stepper-linea--completada' : ''}`} />
            )}
          </Fragment>
        ))}
      </div>

      <div className="crear-reserva-admin__content">
        {error && paso !== 4 && (
          <div className="crear-reserva-admin__error">{error}</div>
        )}

        {paso === 1 && (
          <PasoViajeCliente
            viajes={viajes}
            clientes={clientes}
            viajeSeleccionado={viajeSeleccionado}
            clienteSeleccionado={clienteSeleccionado}
            cargandoViajes={cargandoViajes}
            setViajeSeleccionado={setViajeSeleccionado}
            setClienteSeleccionado={setClienteSeleccionado}
            onSiguiente={() => {
              setError(null);
              setPaso(2);
            }}
            onCancelar={() => navegar('/admin/reservas')}
          />
        )}

        {paso === 2 && clienteSeleccionado && (
          <PasoPasajeros
            pasajeros={pasajeros}
            setPasajeros={setPasajeros}
            precioBase={viajeSeleccionado?.precio_base_eur ?? 0}
            titularClienteId={clienteSeleccionado.id}
            titularPuntoRecogidaId={titularPuntoRecogidaId}
            setTitularPuntoRecogidaId={setTitularPuntoRecogidaId}
            onSiguiente={() => setPaso(3)}
            onAtras={() => setPaso(1)}
          />
        )}

        {paso === 3 && (
          <PasoAsientos
            viajeId={viajeSeleccionado?.id || 0}
            maxAsientos={puestosOcupados}
            asientosSeleccionados={asientosSeleccionados}
            setAsientosSeleccionados={setAsientosSeleccionados}
            onSiguiente={manejarPasoAsientosSiguiente}
            onAtras={() => setPaso(2)}
            guardando={cargando}
          />
        )}

        {paso === 4 && reservaId && (
          <>
            {error && <div className="crear-reserva-admin__error">{error}</div>}
            <PasoPago
              reservaId={reservaId}
              cargando={cargando}
              onAtras={() => setPaso(3)}
              onFinalizar={manejarGuardarReserva}
            />
          </>
        )}
      </div>
    </div>
  );
}
