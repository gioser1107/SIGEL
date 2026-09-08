import { useEffect, useMemo, useState } from 'react';
import Boton from '../../ui/Boton/Boton';
import DomicilioRecogidaAcompanante, {
  type ValorDomicilioAcompanante,
} from '../../puntos-recogida/DomicilioRecogidaAcompanante';
import { etiquetaPunto, referenciaPunto } from '../../puntos-recogida/utils';
import type { PuntoRecogida, PuntoRecogidaInline } from '../../../types/puntoRecogida';
import type { PasajeroPublico } from './pasajeroPublico';

type OpcionRecogida = 'titular' | 'otro' | null;

interface PropsModalAcompananteRecogida {
  abierto: boolean;
  borrador: PasajeroPublico;
  domiciliosTitular: PuntoRecogida[];
  titularPuntoRecogidaId: number | null;
  titularDomicilioNuevo?: PuntoRecogidaInline | null;
  errorDomicilio: string | null;
  onCerrar: () => void;
  onAtras: () => void;
  onGuardar: (domicilio: ValorDomicilioAcompanante) => void;
  onChangeDomicilio: (domicilio: ValorDomicilioAcompanante) => void;
  onLimpiarError: () => void;
}

function resolverIdTitular(
  domiciliosTitular: PuntoRecogida[],
  titularPuntoRecogidaId: number | null,
): number | null {
  if (titularPuntoRecogidaId != null) return titularPuntoRecogidaId;
  const predeterminado = domiciliosTitular.find((d) => d.es_predeterminado)?.id ?? null;
  if (predeterminado) return predeterminado;
  return domiciliosTitular.length === 1 ? domiciliosTitular[0].id : null;
}

function inferirOpcionInicial(
  domicilio: ValorDomicilioAcompanante,
  idTitular: number | null,
  titularNuevo: PuntoRecogidaInline | null,
): OpcionRecogida {
  if (idTitular != null && domicilio.punto_recogida_id === idTitular && !domicilio.puntos_recogida) {
    return 'titular';
  }
  if (
    titularNuevo &&
    domicilio.puntos_recogida &&
    domicilio.punto_recogida_id == null &&
    domicilio.puntos_recogida.direccion === titularNuevo.direccion &&
    domicilio.puntos_recogida.nombre === titularNuevo.nombre
  ) {
    return 'titular';
  }
  if (domicilio.punto_recogida_id != null || domicilio.puntos_recogida) {
    return 'otro';
  }
  return null;
}

export default function ModalAcompananteRecogida({
  abierto,
  borrador,
  domiciliosTitular,
  titularPuntoRecogidaId,
  titularDomicilioNuevo = null,
  errorDomicilio,
  onCerrar,
  onAtras,
  onGuardar,
  onChangeDomicilio,
  onLimpiarError,
}: PropsModalAcompananteRecogida) {
  const idTitular = useMemo(
    () => resolverIdTitular(domiciliosTitular, titularPuntoRecogidaId),
    [domiciliosTitular, titularPuntoRecogidaId],
  );

  const domicilioTitular = useMemo(
    () => (idTitular != null ? domiciliosTitular.find((d) => d.id === idTitular) ?? null : null),
    [domiciliosTitular, idTitular],
  );

  const [opcion, setOpcion] = useState<OpcionRecogida>(null);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  useEffect(() => {
    if (!abierto) return;
    setOpcion(inferirOpcionInicial(borrador.domicilio, idTitular, titularDomicilioNuevo));
    setErrorLocal(null);
  }, [abierto, borrador.id, borrador.domicilio, idTitular, titularDomicilioNuevo]);

  const nombreAcompanante =
    `${borrador.ficha.nombre} ${borrador.ficha.apellido}`.trim() || 'este acompañante';

  const seleccionarTitular = () => {
    if (idTitular == null && !titularDomicilioNuevo) return;
    setOpcion('titular');
    setErrorLocal(null);
    onLimpiarError();
    onChangeDomicilio(
      idTitular != null
        ? { punto_recogida_id: idTitular, puntos_recogida: null }
        : { punto_recogida_id: null, puntos_recogida: titularDomicilioNuevo },
    );
  };

  const seleccionarOtro = () => {
    setOpcion('otro');
    setErrorLocal(null);
    onLimpiarError();
    onChangeDomicilio({ punto_recogida_id: null, puntos_recogida: null });
  };

  const manejarGuardar = () => {
    if (opcion === null) {
      setErrorLocal('Indica si usarás el mismo domicilio del titular u otro diferente.');
      return;
    }

    if (opcion === 'titular') {
      if (idTitular != null) {
        onGuardar({ punto_recogida_id: idTitular, puntos_recogida: null });
        return;
      }
      if (titularDomicilioNuevo) {
        onGuardar({ punto_recogida_id: null, puntos_recogida: titularDomicilioNuevo });
        return;
      }
      setErrorLocal('El titular aún no tiene un domicilio de recogida seleccionado.');
      return;
    }

    if (borrador.domicilio.punto_recogida_id == null && !borrador.domicilio.puntos_recogida) {
      const mensaje =
        borrador.domicilios.length > 0
          ? 'Selecciona el domicilio de recogida del acompañante.'
          : 'Completa el domicilio de recogida del acompañante.';
      setErrorLocal(mensaje);
      return;
    }

    onGuardar(borrador.domicilio);
  };

  if (!abierto) return null;

  const errorVisible = errorLocal ?? errorDomicilio;

  return (
    <div
      className="pr-modal-catalogo__superposicion fp-modal-acompanante__superposicion"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-acompanante-recogida-titulo"
      onClick={onCerrar}
    >
      <div
        className="pr-modal-catalogo pr-modal-domicilio fp-modal-acompanante fp-modal-acompanante--recogida"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pr-modal-catalogo__cabecera">
          <div>
            <span className="fp-modal-acompanante__paso">Paso 2 de 2</span>
            <h2 id="modal-acompanante-recogida-titulo" className="pr-modal-catalogo__titulo">
              Domicilio de recogida
            </h2>
            <p className="pr-modal-catalogo__subtitulo">
              ¿Dónde debe pasar la agencia a recoger a {nombreAcompanante}?
            </p>
          </div>
          <button
            type="button"
            className="pr-modal-catalogo__cerrar"
            onClick={onCerrar}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div className="pr-modal-domicilio__cuerpo">
          <div className="fp-recogida-opciones">
            <button
              type="button"
              className={`fp-recogida-opcion ${opcion === 'titular' ? 'fp-recogida-opcion--activa' : ''}`}
              onClick={seleccionarTitular}
              disabled={idTitular == null && !titularDomicilioNuevo}
            >
              <span className="fp-recogida-opcion__radio" aria-hidden />
              <span className="fp-recogida-opcion__cuerpo">
                <strong>Mismo domicilio del titular</strong>
                {domicilioTitular ? (
                  <span className="fp-recogida-opcion__detalle">
                    {etiquetaPunto(domicilioTitular)}
                    {domicilioTitular.direccion ? ` — ${domicilioTitular.direccion}` : ''}
                    {referenciaPunto(domicilioTitular)
                      ? ` (Ref: ${referenciaPunto(domicilioTitular)})`
                      : ''}
                  </span>
                ) : titularDomicilioNuevo ? (
                  <span className="fp-recogida-opcion__detalle">
                    {titularDomicilioNuevo.nombre}
                    {titularDomicilioNuevo.direccion ? ` — ${titularDomicilioNuevo.direccion}` : ''}
                  </span>
                ) : (
                  <span className="fp-recogida-opcion__detalle fp-recogida-opcion__detalle--aviso">
                    Primero indica la dirección del titular en el paso anterior.
                  </span>
                )}
              </span>
            </button>

            <button
              type="button"
              className={`fp-recogida-opcion ${opcion === 'otro' ? 'fp-recogida-opcion--activa' : ''}`}
              onClick={seleccionarOtro}
            >
              <span className="fp-recogida-opcion__radio" aria-hidden />
              <span className="fp-recogida-opcion__cuerpo">
                <strong>Otro domicilio</strong>
                <span className="fp-recogida-opcion__detalle">
                  Usa un domicilio registrado del acompañante o registra uno nuevo.
                </span>
              </span>
            </button>
          </div>

          {opcion === 'otro' && (
            <DomicilioRecogidaAcompanante
              idPrefix={`modal-acompanante-${borrador.id}`}
              domicilios={borrador.domicilios}
              cargandoDomicilios={borrador.buscandoDocumento}
              value={borrador.domicilio}
              onChange={(domicilio) => {
                onChangeDomicilio(domicilio);
                setErrorLocal(null);
                onLimpiarError();
              }}
            />
          )}

          {errorVisible && (
            <p className="fp-card__error fp-card__error--inline" role="alert">
              {errorVisible}
            </p>
          )}
        </div>

        <div className="pr-modal-catalogo__pie">
          <Boton type="button" variante="secundario" tamano="sm" onClick={onAtras}>
            Atrás
          </Boton>
          <Boton type="button" variante="primario" tamano="sm" onClick={manejarGuardar}>
            Guardar acompañante
          </Boton>
        </div>
      </div>
    </div>
  );
}
