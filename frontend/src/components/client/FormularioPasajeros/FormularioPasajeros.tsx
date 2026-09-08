import { useEffect, useState } from 'react';
import Boton from '../../ui/Boton/Boton';
import DomicilioRecogidaAcompanante, {
  type ValorDomicilioAcompanante,
} from '../../puntos-recogida/DomicilioRecogidaAcompanante';
import { listarMisPuntosRecogida } from '../../../services/puntos_recogida';
import type { PuntoRecogida, PuntoRecogidaInline } from '../../../types/puntoRecogida';
import ListaResumenAcompanantes from './ListaResumenAcompanantes';
import ModalAcompanante from './ModalAcompanante';
import { pasajeroVacio, clonarPasajero, type PasajeroPublico } from './pasajeroPublico';
import { validarPasajeroPublico } from './utils/validarPasajeroPublico';
import '../../../pages/admin/Clientes/components/FormularioClienteCampos.css';
import '../../../pages/admin/Clientes/components/CampoTelefono.css';
import '../../puntos-recogida/puntos-recogida.css';
import './FormularioPasajeros.css';

export type { PasajeroPublico };

export interface EstadoFormularioPasajeros {
  titularPuntoRecogidaId: number | null;
  titularDomicilioNuevo?: PuntoRecogidaInline | null;
  pasajeros: PasajeroPublico[];
  proximoId: number;
}

interface FormularioPasajerosProps {
  viajeId: number;
  recargo_menor_eur: number;
  estadoInicial?: EstadoFormularioPasajeros | null;
  onSubmit: (datos: EstadoFormularioPasajeros) => void;
  onBack: () => void;
}

export default function FormularioPasajeros({
  recargo_menor_eur,
  estadoInicial,
  onSubmit,
  onBack,
}: FormularioPasajerosProps) {
  const [domiciliosTitular, setDomiciliosTitular] = useState<PuntoRecogida[]>([]);
  const [cargandoDomiciliosTitular, setCargandoDomiciliosTitular] = useState(true);
  const [titularDomicilio, setTitularDomicilio] = useState<ValorDomicilioAcompanante>(() => ({
    punto_recogida_id: estadoInicial?.titularPuntoRecogidaId ?? null,
    puntos_recogida: estadoInicial?.titularDomicilioNuevo ?? null,
  }));
  const titularPuntoRecogidaId = titularDomicilio.punto_recogida_id;
  const [pasajeros, setPasajeros] = useState<PasajeroPublico[]>(
    () => estadoInicial?.pasajeros.map(clonarPasajero) ?? [],
  );
  const [proximoId, setProximoId] = useState(() => estadoInicial?.proximoId ?? 0);
  const [errorFormulario, setErrorFormulario] = useState<string | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoModal, setModoModal] = useState<'crear' | 'editar'>('crear');
  const [pasajeroModal, setPasajeroModal] = useState<PasajeroPublico | null>(null);

  useEffect(() => {
    if (!estadoInicial) return;
    setTitularDomicilio({
      punto_recogida_id: estadoInicial.titularPuntoRecogidaId,
      puntos_recogida: estadoInicial.titularDomicilioNuevo ?? null,
    });
    setPasajeros(estadoInicial.pasajeros.map(clonarPasajero));
    setProximoId(estadoInicial.proximoId);
  }, [estadoInicial]);

  useEffect(() => {
    setCargandoDomiciliosTitular(true);
    listarMisPuntosRecogida()
      .then((lista) => {
        setDomiciliosTitular(lista);
        setTitularDomicilio((actual) => {
          if (actual.punto_recogida_id != null || actual.puntos_recogida) return actual;
          const predeterminado = lista.find((d) => d.es_predeterminado)?.id ?? null;
          return { punto_recogida_id: predeterminado, puntos_recogida: null };
        });
      })
      .catch(() => setDomiciliosTitular([]))
      .finally(() => setCargandoDomiciliosTitular(false));
  }, []);

  const abrirNuevo = () => {
    setModoModal('crear');
    setPasajeroModal(pasajeroVacio(proximoId));
    setProximoId((c) => c + 1);
    setModalAbierto(true);
  };

  const abrirEditar = (pasajero: PasajeroPublico) => {
    setModoModal('editar');
    setPasajeroModal(clonarPasajero(pasajero));
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setPasajeroModal(null);
  };

  const guardarDesdeModal = (pasajero: PasajeroPublico) => {
    setPasajeros((prev) => {
      const existe = prev.some((p) => p.id === pasajero.id);
      if (existe) return prev.map((p) => (p.id === pasajero.id ? pasajero : p));
      return [...prev, pasajero];
    });
    setErrorFormulario(null);
    cerrarModal();
  };

  const eliminarPasajero = (id: number) => {
    setPasajeros((prev) => prev.filter((p) => p.id !== id));
  };

  const resolverDomicilioTitular = (id: number | null): number | null => {
    if (id != null) return id;
    const predeterminado = domiciliosTitular.find((d) => d.es_predeterminado)?.id ?? null;
    if (predeterminado) return predeterminado;
    return domiciliosTitular.length === 1 ? domiciliosTitular[0].id : null;
  };

  const manejarEnvio = (e: { preventDefault(): void }) => {
    e.preventDefault();

    const titularNuevo = titularDomicilio.puntos_recogida;
    const titularId = titularNuevo
      ? null
      : resolverDomicilioTitular(titularDomicilio.punto_recogida_id);
    if (!titularId && !titularNuevo) {
      setErrorFormulario(
        domiciliosTitular.length > 0
          ? 'Selecciona tu domicilio o completa la dirección de recogida.'
          : 'Completa la dirección de recogida (etiqueta, dirección, estado y ciudad).',
      );
      return;
    }

    for (let i = 0; i < pasajeros.length; i += 1) {
      const { valido, errores, errorDomicilio } = validarPasajeroPublico(pasajeros[i]);
      if (!valido) {
        setPasajeros((prev) =>
          prev.map((item, idx) => (idx === i ? { ...item, errores } : item)),
        );
        const primerError =
          Object.values(errores).find(Boolean) ??
          errorDomicilio ??
          `Revisa los datos del acompañante ${i + 1}.`;
        setErrorFormulario(primerError);
        abrirEditar(pasajeros[i]);
        return;
      }
    }

    setErrorFormulario(null);
    const pasajerosNormalizados = pasajeros.map((p) => {
      const clon = clonarPasajero(p);
      const idsDomiciliosTitular = new Set(domiciliosTitular.map((d) => d.id));
      if (
        clon.domicilio.punto_recogida_id != null &&
        idsDomiciliosTitular.has(clon.domicilio.punto_recogida_id)
      ) {
        clon.domicilio = titularNuevo
          ? { punto_recogida_id: null, puntos_recogida: titularNuevo }
          : { punto_recogida_id: titularId, puntos_recogida: null };
      }
      return clon;
    });
    onSubmit({
      titularPuntoRecogidaId: titularId,
      titularDomicilioNuevo: titularNuevo,
      pasajeros: pasajerosNormalizados,
      proximoId,
    });
  };

  const totalRecargo = pasajeros.filter((p) => p.es_menor).length * recargo_menor_eur;

  return (
    <>
      <form className="formulario-pago" onSubmit={manejarEnvio}>
        <div className="formulario-pago__header">
          <span className="formulario-pago__tag">Paso 1</span>
          <h2 className="formulario-pago__title">Pasajeros</h2>
          <p className="formulario-pago__subtitle">
            Indica tu domicilio de recogida y registra a quienes viajan contigo.
          </p>
        </div>

        <div className="formulario-pago__body">
          <div className="fp-card">
            <h4 className="fp-card__titulo">Datos del Titular</h4>
            <p className="fp-card__subtitulo">
              Tus datos personales ya están registrados. Escribe la dirección donde debe recogerte
              la agencia o elige un domicilio que ya tengas guardado.
            </p>

            <div className="formulario-pago__field">
              <DomicilioRecogidaAcompanante
                idPrefix="titular-recogida"
                domicilios={domiciliosTitular}
                cargandoDomicilios={cargandoDomiciliosTitular}
                value={titularDomicilio}
                onChange={(valor) => {
                  setErrorFormulario(null);
                  setTitularDomicilio(valor);
                }}
              />
            </div>
          </div>

          <ListaResumenAcompanantes
            pasajeros={pasajeros}
            recargoMenorEur={recargo_menor_eur}
            onAgregar={abrirNuevo}
            onEditar={abrirEditar}
            onEliminar={eliminarPasajero}
          />

          {errorFormulario && (
            <div className="fp-card__error" role="alert">
              {errorFormulario}
            </div>
          )}

          {totalRecargo > 0 && (
            <div className="fp-card__recargo-total">
              <strong>Recargo por menores:</strong> €{totalRecargo.toFixed(2)}
              <span>
                ({pasajeros.filter((x) => x.es_menor).length} menor
                {pasajeros.filter((x) => x.es_menor).length > 1 ? 'es' : ''} × €
                {recargo_menor_eur.toFixed(2)})
              </span>
            </div>
          )}
        </div>

        <div className="formulario-pago__footer" style={{ display: 'flex', gap: '1rem' }}>
          <Boton type="button" variante="secundario" tamano="md" onClick={onBack}>
            Atrás
          </Boton>
          <Boton type="submit" variante="primario" tamano="md" anchoCompleto>
            Continuar
          </Boton>
        </div>
      </form>

      <ModalAcompanante
        abierto={modalAbierto}
        modo={modoModal}
        pasajero={pasajeroModal}
        recargoMenorEur={recargo_menor_eur}
        domiciliosTitular={domiciliosTitular}
        titularPuntoRecogidaId={titularPuntoRecogidaId}
        titularDomicilioNuevo={titularDomicilio.puntos_recogida}
        onCerrar={cerrarModal}
        onGuardar={guardarDesdeModal}
      />
    </>
  );
}
