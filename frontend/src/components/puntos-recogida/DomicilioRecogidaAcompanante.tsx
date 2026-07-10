import { useEffect, useRef, useState } from 'react';
import FormularioPuntoRecogidaCampos, {
  type ValoresFormularioPuntoRecogida,
} from './FormularioPuntoRecogidaCampos';
import SelectorPuntoRecogidaReserva from './SelectorPuntoRecogidaReserva';
import { useEstadosCiudadesSelect } from './useEstadosCiudadesSelect';
import { validarDomicilioRecogida, valoresADomicilioDTO } from './utils';
import type { PuntoRecogida, PuntoRecogidaInline } from '../../types/puntoRecogida';
import './puntos-recogida.css';

const FORM_VACIO: ValoresFormularioPuntoRecogida = { nombre: '', direccion: '', notas: '' };

export interface ValorDomicilioAcompanante {
  punto_recogida_id: number | null;
  puntos_recogida: PuntoRecogidaInline | null;
}

type VistaDomicilio = 'selector' | 'formulario';

interface DomicilioRecogidaAcompananteProps {
  idPrefix: string;
  domicilios: PuntoRecogida[];
  cargandoDomicilios?: boolean;
  value: ValorDomicilioAcompanante;
  onChange: (valor: ValorDomicilioAcompanante) => void;
  error?: string | null;
}

export function validarValorDomicilioAcompanante(
  valor: ValorDomicilioAcompanante,
  form: ValoresFormularioPuntoRecogida,
  estadoId: string,
  ciudadId: string,
  domicilios: PuntoRecogida[],
): string | null {
  if (valor.punto_recogida_id != null) return null;
  if (valor.puntos_recogida) return null;
  if (domicilios.length > 0) {
    return 'Selecciona el domicilio de recogida del acompañante.';
  }
  return validarDomicilioRecogida(form, estadoId, ciudadId, { referenciaOpcional: true });
}

export default function DomicilioRecogidaAcompanante({
  idPrefix,
  domicilios,
  cargandoDomicilios = false,
  value,
  onChange,
  error,
}: DomicilioRecogidaAcompananteProps) {
  const [vista, setVista] = useState<VistaDomicilio>(
    domicilios.length === 0 ? 'formulario' : 'selector',
  );
  const [form, setForm] = useState<ValoresFormularioPuntoRecogida>(FORM_VACIO);
  const ubicacion = useEstadosCiudadesSelect();
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (domicilios.length === 0) {
      setVista('formulario');
      return;
    }
    if (value.puntos_recogida) {
      setVista('formulario');
    }
  }, [domicilios.length, value.puntos_recogida]);

  useEffect(() => {
    if (vista !== 'selector' || domicilios.length === 0) return;
    if (value.punto_recogida_id != null || value.puntos_recogida) return;
    const pred = domicilios.find((d) => d.es_predeterminado)?.id ?? domicilios[0]?.id ?? null;
    if (pred != null) {
      onChangeRef.current({ punto_recogida_id: pred, puntos_recogida: null });
    }
  }, [vista, domicilios, value.punto_recogida_id, value.puntos_recogida]);

  function seleccionarExistente(id: number | null) {
    onChange({ punto_recogida_id: id, puntos_recogida: null });
  }

  function activarNuevo() {
    setVista('formulario');
    setForm(FORM_VACIO);
    ubicacion.limpiarUbicacion();
    onChange({ punto_recogida_id: null, puntos_recogida: null });
  }

  function volverAExistentes() {
    setVista('selector');
    setForm(FORM_VACIO);
    ubicacion.limpiarUbicacion();
    const pred = domicilios.find((d) => d.es_predeterminado)?.id ?? domicilios[0]?.id ?? null;
    onChange({ punto_recogida_id: pred, puntos_recogida: null });
  }

  function sincronizarInline(
    nuevoForm: ValoresFormularioPuntoRecogida,
    estadoActivo: string,
    ciudadActiva: string,
  ) {
    setForm(nuevoForm);
    const errorValidacion = validarDomicilioRecogida(nuevoForm, estadoActivo, ciudadActiva, {
      referenciaOpcional: true,
    });
    if (errorValidacion) {
      onChange({ punto_recogida_id: null, puntos_recogida: null });
      return;
    }
    const estadoNombre = ubicacion.estados.find((e) => String(e.id) === estadoActivo)?.nombre;
    const ciudadNombre = ubicacion.ciudades.find((c) => String(c.id) === ciudadActiva)?.nombre;
    onChange({
      punto_recogida_id: null,
      puntos_recogida: valoresADomicilioDTO(nuevoForm, estadoNombre, ciudadNombre, true),
    });
  }

  return (
    <div className="pr-domicilio-acompanante">
      {cargandoDomicilios && (
        <p className="pr-selector-reserva__aviso">Cargando domicilios registrados…</p>
      )}

      {vista === 'selector' && domicilios.length > 0 && (
        <div className="fp-domicilio-panel">
          <SelectorPuntoRecogidaReserva
            domicilios={domicilios}
            cargando={cargandoDomicilios}
            value={value.punto_recogida_id}
            onChange={seleccionarExistente}
            label="Domicilio registrado"
            requerido
            sinDomiciliosMensaje="Este acompañante no tiene domicilios registrados."
            ocultarEnlacePerfil
          />
          <button type="button" className="fp-domicilio-panel__nuevo" onClick={activarNuevo}>
            + Registrar otro domicilio
          </button>
        </div>
      )}

      {vista === 'formulario' && (
        <div className="fp-domicilio-panel fp-domicilio-panel--formulario">
          {domicilios.length > 0 && (
            <div className="fp-domicilio-panel__cabecera">
              <span className="fp-domicilio-panel__etiqueta">Nuevo domicilio</span>
              <button type="button" className="fp-domicilio-panel__volver" onClick={volverAExistentes}>
                ← Usar domicilio registrado
              </button>
            </div>
          )}
          <FormularioPuntoRecogidaCampos
            idPrefix={idPrefix}
            compacto
            valores={form}
            estadoId={ubicacion.estadoId}
            ciudadId={ubicacion.ciudadId}
            estados={ubicacion.estados}
            ciudades={ubicacion.ciudades}
            cargandoEstados={ubicacion.cargandoEstados}
            cargandoCiudades={ubicacion.cargandoCiudades}
            referenciaOpcional
            error={error}
            onChange={(campo, valor) =>
              sincronizarInline({ ...form, [campo]: valor }, ubicacion.estadoId, ubicacion.ciudadId)
            }
            onEstadoChange={(id) => {
              ubicacion.setEstadoId(id);
              ubicacion.setCiudadId('');
              void ubicacion.cargarCiudades(id);
              onChange({ punto_recogida_id: null, puntos_recogida: null });
            }}
            onCiudadChange={(id) => {
              ubicacion.setCiudadId(id);
              sincronizarInline(form, ubicacion.estadoId, id);
            }}
          />
        </div>
      )}
    </div>
  );
}
