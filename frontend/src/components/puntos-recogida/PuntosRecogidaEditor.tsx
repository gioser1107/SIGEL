import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  agregarMiPuntoRecogida,
  agregarPuntoRecogidaCliente,
  editarMiPuntoRecogida,
  editarPuntoRecogidaCliente,
  listarMisPuntosRecogida,
  listarPuntosRecogidaCliente,
  marcarMiPuntoPredeterminado,
  marcarPuntoPredeterminadoCliente,
  quitarMiPuntoRecogida,
  quitarPuntoRecogidaCliente,
} from '../../services/puntos_recogida';
import type {
  ModoPuntosRecogidaEditor,
  PuntoRecogida,
  PuntosRecogidaDraft,
} from '../../types/puntoRecogida';
import { PUNTOS_RECOGIDA_DRAFT_VACIO } from '../../types/puntoRecogida';
import Boton from '../ui/Boton/Boton';
import FormularioPuntoRecogidaCampos, {
  type ValoresFormularioPuntoRecogida,
} from './FormularioPuntoRecogidaCampos';
import ModalDomicilioRecogida from './ModalDomicilioRecogida';
import PuntoRecogidaTarjeta from './PuntoRecogidaTarjeta';
import PuntosRecogidaList from './PuntosRecogidaList';
import { useEstadosCiudadesSelect } from './useEstadosCiudadesSelect';
import {
  agregarNuevoDraft,
  actualizarNuevoDraft,
  marcarPredeterminadoDraft,
  quitarNuevoDraft,
  validarDomicilioRecogida,
  valoresADomicilioDTO,
} from './utils';
import './puntos-recogida.css';

const FORM_VACIO: ValoresFormularioPuntoRecogida = { nombre: '', direccion: '', notas: '' };

export interface PuntosRecogidaEditorHandle {
  abrirAgregar: () => void;
}

interface PuntosRecogidaEditorProps {
  mode: ModoPuntosRecogidaEditor;
  clienteId?: number;
  value?: PuntosRecogidaDraft;
  onChange?: (v: PuntosRecogidaDraft) => void;
  onError?: (msg: string) => void;
  onPuntosChange?: (cantidad: number) => void;
  colapsable?: boolean;
  ocultarBotonAgregar?: boolean;
}

const PuntosRecogidaEditor = forwardRef<PuntosRecogidaEditorHandle, PuntosRecogidaEditorProps>(
  function PuntosRecogidaEditor(
    {
      mode,
      clienteId,
      value = PUNTOS_RECOGIDA_DRAFT_VACIO,
      onChange,
      onError,
      onPuntosChange,
      colapsable = false,
      ocultarBotonAgregar = false,
    },
    ref,
  ) {
  const esLive = mode === 'profile' || mode === 'admin-edit';
  const [expandido, setExpandido] = useState(!colapsable);
  const [puntosLive, setPuntosLive] = useState<PuntoRecogida[]>([]);
  const [formAbierto, setFormAbierto] = useState(false);
  const [editandoLiveId, setEditandoLiveId] = useState<number | null>(null);
  const [editandoDraftIndex, setEditandoDraftIndex] = useState<number | null>(null);
  const [form, setForm] = useState<ValoresFormularioPuntoRecogida>(FORM_VACIO);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const valueRef = useRef(value);
  valueRef.current = value;

  const ubicacion = useEstadosCiudadesSelect();

  const recargarLive = useCallback(async () => {
    if (!esLive) return;
    setCargando(true);
    try {
      const lista =
        mode === 'profile'
          ? await listarMisPuntosRecogida()
          : await listarPuntosRecogidaCliente(clienteId!);
      setPuntosLive(lista);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Error al cargar domicilios');
    } finally {
      setCargando(false);
    }
  }, [esLive, mode, clienteId, onError]);

  useEffect(() => {
    if (esLive) recargarLive();
  }, [esLive, recargarLive]);

  useEffect(() => {
    if (esLive) onPuntosChange?.(puntosLive.length);
  }, [esLive, puntosLive.length, onPuntosChange]);

  const abrirAgregar = useCallback(() => {
    setForm(FORM_VACIO);
    setErrorForm(null);
    ubicacion.limpiarUbicacion();
    setEditandoLiveId(null);
    setEditandoDraftIndex(null);
    setFormAbierto(true);
  }, [ubicacion]);

  useImperativeHandle(ref, () => ({ abrirAgregar }), [abrirAgregar]);

  function cerrarFormulario() {
    setFormAbierto(false);
    setEditandoLiveId(null);
    setEditandoDraftIndex(null);
    setForm(FORM_VACIO);
    setErrorForm(null);
    ubicacion.limpiarUbicacion();
  }

  async function abrirEditarLive(p: PuntoRecogida) {
    setEditandoLiveId(p.id);
    setEditandoDraftIndex(null);
    setForm({
      nombre: p.nombre,
      direccion: p.direccion ?? '',
      notas: p.referencia ?? p.notas_referencia ?? '',
    });
    setFormAbierto(true);
    await ubicacion.initDesdeNombres(p.estado, p.ciudad);
  }

  async function abrirEditarDraft(index: number) {
    const p = valueRef.current.nuevos[index];
    setEditandoDraftIndex(index);
    setEditandoLiveId(null);
    setForm({
      nombre: p.nombre,
      direccion: p.direccion,
      notas: p.notas_referencia,
    });
    setFormAbierto(true);
    await ubicacion.initDesdeNombres(p.estado, p.ciudad);
  }

  async function guardarFormulario() {
    const errorValidacion = validarDomicilioRecogida(form, ubicacion.estadoId, ubicacion.ciudadId);
    if (errorValidacion) {
      setErrorForm(errorValidacion);
      return;
    }

    const { estado, ciudad } = ubicacion.nombresSeleccionados();
    const esPrimerDomicilio =
      (esLive && puntosLive.length === 0) ||
      (!esLive && valueRef.current.nuevos.length === 0 && editandoDraftIndex == null);
    const dto = valoresADomicilioDTO(form, estado, ciudad, esPrimerDomicilio);

    setProcesando(true);
    setErrorForm(null);
    try {
      if (esLive) {
        if (editandoLiveId != null) {
          if (mode === 'profile') {
            await editarMiPuntoRecogida(editandoLiveId, dto);
          } else {
            await editarPuntoRecogidaCliente(clienteId!, editandoLiveId, dto);
          }
        } else if (mode === 'profile') {
          await agregarMiPuntoRecogida(dto);
        } else {
          await agregarPuntoRecogidaCliente(clienteId!, dto);
        }
        cerrarFormulario();
        await recargarLive();
      } else if (editandoDraftIndex != null) {
        onChange?.(actualizarNuevoDraft(valueRef.current, editandoDraftIndex, dto));
        cerrarFormulario();
      } else {
        onChange?.(agregarNuevoDraft(valueRef.current, dto));
        cerrarFormulario();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo guardar el domicilio';
      setErrorForm(msg);
      onError?.(msg);
    } finally {
      setProcesando(false);
    }
  }

  async function marcarLive(id: number) {
    setProcesando(true);
    try {
      if (mode === 'profile') {
        await marcarMiPuntoPredeterminado(id);
      } else {
        await marcarPuntoPredeterminadoCliente(clienteId!, id);
      }
      await recargarLive();
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'No se pudo marcar predeterminado');
    } finally {
      setProcesando(false);
    }
  }

  async function quitarLive(id: number) {
    if (!window.confirm('¿Eliminar este domicilio de recogida?')) return;
    setProcesando(true);
    try {
      if (mode === 'profile') {
        await quitarMiPuntoRecogida(id);
      } else {
        await quitarPuntoRecogidaCliente(clienteId!, id);
      }
      await recargarLive();
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'No se pudo eliminar el domicilio');
    } finally {
      setProcesando(false);
    }
  }

  const draftItems = !esLive
    ? value.nuevos.map((p, index) => ({
        key: `n-${index}`,
        nombre: p.nombre,
        direccion: p.direccion,
        ciudad: p.ciudad,
        estado: p.estado,
        referencia: p.notas_referencia,
        predeterminado:
          value.predeterminadoNuevoIndex === index ||
          (value.predeterminadoNuevoIndex == null && value.nuevos.length === 1 && index === 0),
        onPred: () => onChange?.(marcarPredeterminadoDraft(valueRef.current, index)),
        onEditar: () => void abrirEditarDraft(index),
        onQuitar: () => onChange?.(quitarNuevoDraft(valueRef.current, index)),
      }))
    : [];

  const esAdminEdit = mode === 'admin-edit';

  const contenido = (
    <>
      <div className="pr-editor">
        {esAdminEdit && (
          <header className="pr-seccion__cabecera">
            <h3 className="pr-seccion__titulo">Domicilios de recogida</h3>
            <p className="pr-seccion__desc">
              Lugares donde la agencia recogerá a este cliente en sus viajes.
            </p>
          </header>
        )}
        {esLive ? (
          <>
            {cargando ? (
              <p className="pr-editor__hint">Cargando domicilios…</p>
            ) : (
              <PuntosRecogidaList
                puntos={puntosLive}
                onMarcarPredeterminado={marcarLive}
                onQuitar={quitarLive}
                onEditar={(id) => {
                  const p = puntosLive.find((x) => x.id === id);
                  if (p) void abrirEditarLive(p);
                }}
                accionesDeshabilitadas={procesando}
              />
            )}
          </>
        ) : draftItems.length === 0 ? (
          <p className="pr-editor__hint">
            Registra el domicilio donde la agencia pasará a recogerte (casa, familiar, etc.).
          </p>
        ) : (
          <div className="pr-lista">
            {draftItems.map((item) => (
              <PuntoRecogidaTarjeta
                key={item.key}
                nombre={item.nombre}
                direccion={item.direccion}
                ciudad={item.ciudad}
                estado={item.estado}
                referencia={item.referencia}
                esPredeterminado={item.predeterminado}
                onMarcarPredeterminado={!item.predeterminado ? item.onPred : undefined}
                onEditar={item.onEditar}
                onQuitar={item.onQuitar}
              />
            ))}
          </div>
        )}

        {!ocultarBotonAgregar && (
          <div className="pr-editor__agregar-inline">
            <Boton
              type="button"
              variante="secundario"
              tamano="sm"
              onClick={abrirAgregar}
              disabled={procesando}
            >
              + Agregar domicilio
            </Boton>
          </div>
        )}
      </div>

      <ModalDomicilioRecogida
        abierto={formAbierto}
        titulo={
          editandoLiveId != null || editandoDraftIndex != null
            ? 'Editar domicilio'
            : 'Nuevo domicilio de recogida'
        }
        idPrefix={`pr-${mode}`}
        procesando={procesando}
        valores={form}
        estadoId={ubicacion.estadoId}
        ciudadId={ubicacion.ciudadId}
        estados={ubicacion.estados}
        ciudades={ubicacion.ciudades}
        cargandoCiudades={ubicacion.cargandoCiudades}
        error={errorForm}
        onChange={(campo, valor) => setForm((prev) => ({ ...prev, [campo]: valor }))}
        onEstadoChange={(id) => {
          ubicacion.setEstadoId(id);
          ubicacion.setCiudadId('');
          void ubicacion.cargarCiudades(id);
        }}
        onCiudadChange={ubicacion.setCiudadId}
        onCerrar={cerrarFormulario}
        onGuardar={() => void guardarFormulario()}
        etiquetaGuardar={
          editandoLiveId != null || editandoDraftIndex != null ? 'Guardar cambios' : 'Agregar domicilio'
        }
      />
    </>
  );

  if (!colapsable) {
    return contenido;
  }

  return (
    <section className="pr-editor-seccion">
      <button
        type="button"
        className="pr-editor-seccion__toggle"
        onClick={() => setExpandido((v) => !v)}
        aria-expanded={expandido}
      >
        <span className="pr-editor-seccion__toggle-texto">Domicilios de recogida</span>
        <svg
          className={`pr-editor-seccion__chevron${expandido ? ' pr-editor-seccion__chevron--abierto' : ''}`}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {expandido && contenido}
    </section>
  );
  },
);

export default PuntosRecogidaEditor;
