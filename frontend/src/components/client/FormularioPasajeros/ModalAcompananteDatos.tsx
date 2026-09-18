import Boton from '../../ui/Boton/Boton';
import FormularioClienteCampos from '../../../pages/admin/Clientes/components/FormularioClienteCampos';
import type { CiudadUbicacion, EstadoUbicacion } from '../../../types/cliente';
import CamposPoliticaMenor from './CamposPoliticaMenor';
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
  errorContinuar?: string | null;
  onCerrar: () => void;
  onContinuar: () => void;
  onBlurDocumento: () => void;
  onChange: (actualizador: (prev: PasajeroPublico['ficha']) => PasajeroPublico['ficha']) => void;
  onLimpiarError: (campo: keyof PasajeroPublico['errores']) => void;
  onToggleMenor: (esMenor: boolean) => void;
  onFechaNacimiento: (fecha: string) => void;
  onOcupaAsiento: (ocupa: boolean) => void;
  onPartidaUrl: (url: string | null) => void;
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
  errorContinuar,
  onCerrar,
  onContinuar,
  onBlurDocumento,
  onChange,
  onLimpiarError,
  onToggleMenor,
  onFechaNacimiento,
  onOcupaAsiento,
  onPartidaUrl,
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
          <CamposPoliticaMenor
            idPrefijo={`modal-acompanante-${borrador.id}`}
            esMenor={borrador.es_menor}
            fechaNacimiento={borrador.fecha_nacimiento}
            ocupaAsiento={borrador.ocupa_asiento}
            partidaUrl={borrador.partida_nacimiento_url}
            recargoMenorEur={recargoMenorEur}
            onToggleMenor={onToggleMenor}
            onFechaNacimiento={onFechaNacimiento}
            onOcupaAsiento={onOcupaAsiento}
            onPartidaUrl={onPartidaUrl}
          />

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

          {errorContinuar && (
            <div className="fp-card__error" role="alert">
              {errorContinuar}
            </div>
          )}

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
