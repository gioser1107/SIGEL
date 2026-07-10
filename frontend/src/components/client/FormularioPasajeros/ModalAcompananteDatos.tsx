import Boton from '../../ui/Boton/Boton';
import FormularioClienteCampos from '../../../pages/admin/Clientes/components/FormularioClienteCampos';
import type { CiudadUbicacion, EstadoUbicacion } from '../../../types/cliente';
import type { PasajeroPublico } from './pasajeroPublico';

interface PropsModalAcompananteDatos {
  abierto: boolean;
  modo: 'crear' | 'editar';
  borrador: PasajeroPublico;
  estados: EstadoUbicacion[];
  ciudades: CiudadUbicacion[];
  cargandoEstados: boolean;
  cargandoCiudades: boolean;
  recargoMenorEur: number;
  onCerrar: () => void;
  onContinuar: () => void;
  onBlurDocumento: () => void;
  onChange: (actualizador: (prev: PasajeroPublico['ficha']) => PasajeroPublico['ficha']) => void;
  onLimpiarError: (campo: keyof PasajeroPublico['errores']) => void;
  onToggleMenor: (esMenor: boolean) => void;
}

export default function ModalAcompananteDatos({
  abierto,
  modo,
  borrador,
  estados,
  ciudades,
  cargandoEstados,
  cargandoCiudades,
  recargoMenorEur,
  onCerrar,
  onContinuar,
  onBlurDocumento,
  onChange,
  onLimpiarError,
  onToggleMenor,
}: PropsModalAcompananteDatos) {
  if (!abierto) return null;

  return (
    <div
      className="pr-modal-catalogo__superposicion fp-modal-acompanante__superposicion"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-acompanante-datos-titulo"
      onClick={onCerrar}
    >
      <div
        className="pr-modal-catalogo pr-modal-domicilio fp-modal-acompanante fp-modal-acompanante--datos"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pr-modal-catalogo__cabecera">
          <div>
            <span className="fp-modal-acompanante__paso">Paso 1 de 2</span>
            <h2 id="modal-acompanante-datos-titulo" className="pr-modal-catalogo__titulo">
              {modo === 'crear' ? 'Nuevo acompañante' : 'Editar acompañante'}
            </h2>
            <p className="pr-modal-catalogo__subtitulo">
              Datos personales del acompañante. En el siguiente paso indicarás dónde recogerlo.
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
          <div className="fp-menor-prioridad">
            <label className="fp-menor-prioridad__label">
              <input
                type="checkbox"
                className="fp-menor-prioridad__check"
                checked={borrador.es_menor}
                onChange={(e) => onToggleMenor(e.target.checked)}
              />
              <span className="fp-menor-prioridad__texto">
                <strong>¿Es menor de edad?</strong>
                <span>Indícalo primero; puede aplicar un recargo en la tarifa del viaje.</span>
              </span>
            </label>
            {borrador.es_menor && recargoMenorEur > 0 && (
              <span className="fp-menor-prioridad__recargo">+€{recargoMenorEur.toFixed(2)} de recargo</span>
            )}
          </div>

          <FormularioClienteCampos
            idPrefijo={`modal-acompanante-${borrador.id}`}
            ocultarIntro
            variante="acompanante"
            form={borrador.ficha}
            erroresForm={borrador.errores}
            estados={estados}
            ciudades={ciudades}
            cargandoEstados={cargandoEstados}
            cargandoCiudades={cargandoCiudades}
            onBlurDocumento={onBlurDocumento}
            onChange={onChange}
            onLimpiarError={onLimpiarError}
          />

          {borrador.buscandoDocumento && (
            <p className="pr-selector-reserva__aviso">Buscando cliente registrado…</p>
          )}

          {borrador.domicilios.length > 0 && !borrador.buscandoDocumento && (
            <p className="pr-selector-reserva__aviso pr-selector-reserva__aviso--ok">
              Cliente encontrado con {borrador.domicilios.length} domicilio
              {borrador.domicilios.length === 1 ? '' : 's'} registrado
              {borrador.domicilios.length === 1 ? '' : 's'}.
            </p>
          )}
        </div>

        <div className="pr-modal-catalogo__pie">
          <Boton type="button" variante="secundario" tamano="sm" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton type="button" variante="primario" tamano="sm" onClick={onContinuar}>
            Continuar
          </Boton>
        </div>
      </div>
    </div>
  );
}
