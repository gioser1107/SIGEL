import { useCallback, useEffect, useRef, useState } from 'react';
import { clienteAFormulario } from '../../../pages/admin/Clientes/utils/mapeoFormulario';
import { buscarClientePorDocumento } from '../../../services/clientes';
import type { Cliente } from '../../../types/cliente';
import type { PuntoRecogida } from '../../../types/puntoRecogida';
import type { ValorDomicilioAcompanante } from '../../puntos-recogida/DomicilioRecogidaAcompanante';
import useUbicacionesCliente from '../../../pages/admin/Clientes/hooks/useUbicacionesCliente';
import ModalAcompananteDatos from './ModalAcompananteDatos';
import ModalAcompananteRecogida from './ModalAcompananteRecogida';
import { clonarPasajero, type PasajeroPublico } from './pasajeroPublico';
import { validarFichaPasajeroPublico } from './utils/validarPasajeroPublico';

const DOMICILIO_VACIO: ValorDomicilioAcompanante = {
  punto_recogida_id: null,
  puntos_recogida: null,
};

type PasoModal = 'datos' | 'recogida';

function fusionarFichaConCliente(
  prev: PasajeroPublico,
  cliente: Cliente,
): PasajeroPublico['ficha'] {
  const fichaApi = clienteAFormulario(cliente);
  return {
    ...fichaApi,
    estado_id: prev.ficha.estado_id !== '' ? prev.ficha.estado_id : fichaApi.estado_id,
    ciudad_id: prev.ficha.ciudad_id !== '' ? prev.ficha.ciudad_id : fichaApi.ciudad_id,
  };
}

interface PropsModalAcompanante {
  abierto: boolean;
  modo: 'crear' | 'editar';
  pasajero: PasajeroPublico | null;
  recargoMenorEur: number;
  domiciliosTitular: PuntoRecogida[];
  titularPuntoRecogidaId: number | null;
  onCerrar: () => void;
  onGuardar: (pasajero: PasajeroPublico) => void;
}

export default function ModalAcompanante({
  abierto,
  modo,
  pasajero,
  recargoMenorEur,
  domiciliosTitular,
  titularPuntoRecogidaId,
  onCerrar,
  onGuardar,
}: PropsModalAcompanante) {
  const [borrador, setBorrador] = useState<PasajeroPublico | null>(null);
  const borradorRef = useRef(borrador);
  borradorRef.current = borrador;
  const [paso, setPaso] = useState<PasoModal>('datos');
  const [errorDomicilio, setErrorDomicilio] = useState<string | null>(null);

  const aplicarClienteEncontrado = useCallback((cliente: Cliente) => {
    const domicilios = cliente.puntos_recogida ?? [];
    const pred = domicilios.find((d) => d.es_predeterminado)?.id ?? domicilios[0]?.id ?? null;

    setBorrador((prev) => {
      if (!prev) return prev;
      const tieneDomicilioManual =
        prev.domicilio.punto_recogida_id != null || prev.domicilio.puntos_recogida != null;

      return {
        ...prev,
        ficha: fusionarFichaConCliente(prev, cliente),
        domicilios,
        domicilio: tieneDomicilioManual
          ? prev.domicilio
          : pred != null
            ? { punto_recogida_id: pred, puntos_recogida: null }
            : { ...DOMICILIO_VACIO },
        buscandoDocumento: false,
        errores: {},
      };
    });
  }, []);

  useEffect(() => {
    if (!abierto || !pasajero) return;

    const clon = clonarPasajero(pasajero);
    setBorrador(clon);
    setPaso('datos');
    setErrorDomicilio(null);

    const doc = clon.ficha.numero_documento.trim();
    if (!doc) return;

    let activo = true;
    setBorrador((prev) => (prev ? { ...prev, buscandoDocumento: true } : prev));

    buscarClientePorDocumento(clon.ficha.tipo_documento, doc)
      .then((cliente) => {
        if (!activo) return;
        if (!cliente) {
          setBorrador((prev) =>
            prev ? { ...prev, buscandoDocumento: false } : prev,
          );
          return;
        }
        aplicarClienteEncontrado(cliente);
      })
      .catch(() => {
        if (!activo) return;
        setBorrador((prev) =>
          prev ? { ...prev, buscandoDocumento: false } : prev,
        );
      });

    return () => {
      activo = false;
    };
  }, [abierto, pasajero, aplicarClienteEncontrado]);

  useEffect(() => {
    if (!abierto) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [abierto, onCerrar]);

  const manejarCiudadInvalida = useCallback(() => {
    setBorrador((prev) =>
      prev ? { ...prev, ficha: { ...prev.ficha, ciudad_id: '' } } : prev,
    );
  }, []);

  const { estados, ciudades, cargandoEstados, cargandoCiudades } = useUbicacionesCliente({
    panelAbierto: abierto && paso === 'datos',
    estadoId: borrador?.ficha.estado_id ?? '',
    ciudadId: borrador?.ficha.ciudad_id ?? '',
    onError: () => {},
    onCiudadInvalida: manejarCiudadInvalida,
  });

  const actualizarBorrador = useCallback((parcial: Partial<PasajeroPublico>) => {
    setBorrador((prev) => (prev ? { ...prev, ...parcial } : prev));
  }, []);

  const manejarChangeFicha = useCallback(
    (actualizador: (prev: PasajeroPublico['ficha']) => PasajeroPublico['ficha']) => {
      setBorrador((prev) => {
        if (!prev) return prev;
        const nuevaFicha = actualizador(prev.ficha);
        const docCambio =
          nuevaFicha.tipo_documento !== prev.ficha.tipo_documento ||
          nuevaFicha.numero_documento !== prev.ficha.numero_documento;

        return {
          ...prev,
          ficha: nuevaFicha,
          errores: {},
          ...(docCambio
            ? { domicilios: [], domicilio: { ...DOMICILIO_VACIO } }
            : {}),
        };
      });
    },
    [],
  );

  const manejarLimpiarError = useCallback((campo: keyof PasajeroPublico['errores']) => {
    setBorrador((prev) =>
      prev ? { ...prev, errores: { ...prev.errores, [campo]: undefined } } : prev,
    );
  }, []);

  const buscarPorDocumento = useCallback(async () => {
    const snapshot = borradorRef.current;
    if (!snapshot) return;

    const doc = snapshot.ficha.numero_documento.trim();
    if (!doc) {
      setBorrador((prev) =>
        prev
          ? { ...prev, domicilios: [], domicilio: { ...DOMICILIO_VACIO } }
          : prev,
      );
      return;
    }

    setBorrador((prev) => (prev ? { ...prev, buscandoDocumento: true } : prev));

    try {
      const cliente = await buscarClientePorDocumento(
        snapshot.ficha.tipo_documento,
        doc,
      );
      if (cliente) {
        aplicarClienteEncontrado(cliente);
        return;
      }
      setBorrador((prev) =>
        prev
          ? {
              ...prev,
              domicilios: [],
              domicilio: { ...DOMICILIO_VACIO },
              buscandoDocumento: false,
            }
          : prev,
      );
    } catch {
      setBorrador((prev) =>
        prev
          ? {
              ...prev,
              domicilios: [],
              domicilio: { ...DOMICILIO_VACIO },
              buscandoDocumento: false,
            }
          : prev,
      );
    }
  }, [aplicarClienteEncontrado]);

  const manejarContinuar = () => {
    if (!borrador) return;
    const { errores, valido } = validarFichaPasajeroPublico(borrador.ficha);
    if (!valido) {
      setBorrador((prev) => (prev ? { ...prev, errores } : prev));
      return;
    }
    setBorrador((prev) => (prev ? { ...prev, errores: {} } : prev));
    setErrorDomicilio(null);
    setPaso('recogida');
  };

  const manejarGuardarRecogida = (domicilio: ValorDomicilioAcompanante) => {
    if (!borrador) return;
    onGuardar({
      ...borrador,
      domicilio,
      errores: {},
    });
  };

  if (!abierto || !borrador) return null;

  return (
    <>
      <ModalAcompananteDatos
        abierto={paso === 'datos'}
        modo={modo}
        borrador={borrador}
        estados={estados}
        ciudades={ciudades}
        cargandoEstados={cargandoEstados}
        cargandoCiudades={cargandoCiudades}
        recargoMenorEur={recargoMenorEur}
        onCerrar={onCerrar}
        onContinuar={manejarContinuar}
        onBlurDocumento={() => void buscarPorDocumento()}
        onChange={manejarChangeFicha}
        onLimpiarError={manejarLimpiarError}
        onToggleMenor={(esMenor) => actualizarBorrador({ es_menor: esMenor })}
      />

      <ModalAcompananteRecogida
        abierto={paso === 'recogida'}
        borrador={borrador}
        domiciliosTitular={domiciliosTitular}
        titularPuntoRecogidaId={titularPuntoRecogidaId}
        errorDomicilio={errorDomicilio}
        onCerrar={onCerrar}
        onAtras={() => setPaso('datos')}
        onGuardar={manejarGuardarRecogida}
        onChangeDomicilio={(domicilio) => actualizarBorrador({ domicilio })}
        onLimpiarError={() => setErrorDomicilio(null)}
      />
    </>
  );
}
