import type { PuntoRecogidaInline, PuntosRecogidaDraft } from '../../types/puntoRecogida';
import type { PuntoRecogida } from '../../types/puntoRecogida';
import type { ValoresFormularioPuntoRecogida } from './FormularioPuntoRecogidaCampos';

export function etiquetaPunto(p: Pick<PuntoRecogida, 'nombre' | 'ciudad' | 'estado'>): string {
  const partes = [p.nombre];
  if (p.ciudad || p.estado) {
    partes.push([p.ciudad, p.estado].filter(Boolean).join(', '));
  }
  return partes.join(' · ');
}

export function referenciaPunto(p: Pick<PuntoRecogida, 'notas_referencia' | 'referencia'>): string {
  return p.referencia ?? p.notas_referencia ?? '';
}

export function validarDomicilioRecogida(
  valores: ValoresFormularioPuntoRecogida,
  estadoId: string,
  ciudadId: string,
  opciones?: { referenciaOpcional?: boolean },
): string | null {
  if (!valores.nombre.trim()) return 'Ingresa una etiqueta (ej. Mi casa, Casa de mamá).';
  if (valores.nombre.trim().length < 2) return 'La etiqueta debe tener al menos 2 caracteres.';
  if (!valores.direccion.trim()) return 'Ingresa la dirección exacta.';
  if (valores.direccion.trim().length < 5) return 'La dirección debe tener al menos 5 caracteres.';
  if (valores.direccion.trim().length > 255) return 'La dirección no puede superar 255 caracteres.';
  if (!estadoId) return 'Selecciona el estado.';
  if (!ciudadId) return 'Selecciona la ciudad.';
  if (!opciones?.referenciaOpcional && !valores.notas.trim()) {
    return 'Ingresa una referencia (portón, timbre, punto de referencia).';
  }
  if (valores.notas.trim() && valores.notas.trim().length < 2) {
    return 'La referencia debe tener al menos 2 caracteres.';
  }
  if (valores.notas.trim().length > 255) {
    return 'La referencia no puede superar 255 caracteres.';
  }
  return null;
}

export function valoresADomicilioDTO(
  valores: ValoresFormularioPuntoRecogida,
  estadoNombre: string | undefined,
  ciudadNombre: string | undefined,
  es_predeterminado?: boolean,
): PuntoRecogidaInline {
  return {
    nombre: valores.nombre.trim(),
    direccion: valores.direccion.trim(),
    ciudad: ciudadNombre ?? '',
    estado: estadoNombre ?? '',
    notas_referencia: valores.notas.trim(),
    es_predeterminado,
  };
}

export function draftAPayloadPuntos(draft: PuntosRecogidaDraft): {
  puntos_recogida?: PuntoRecogidaInline[];
} {
  if (draft.nuevos.length === 0) {
    return {};
  }

  const puntos_recogida = draft.nuevos.map((p, index) => ({
    ...p,
    es_predeterminado:
      draft.predeterminadoNuevoIndex === index ||
      (draft.predeterminadoNuevoIndex == null && draft.nuevos.length === 1 && index === 0),
  }));

  return { puntos_recogida };
}

export function marcarPredeterminadoDraft(
  draft: PuntosRecogidaDraft,
  index: number,
): PuntosRecogidaDraft {
  return {
    ...draft,
    predeterminadoNuevoIndex: index,
    nuevos: draft.nuevos.map((p, i) => ({ ...p, es_predeterminado: i === index })),
  };
}

export function agregarNuevoDraft(
  draft: PuntosRecogidaDraft,
  punto: PuntoRecogidaInline,
): PuntosRecogidaDraft {
  const nuevos = [...draft.nuevos, punto];
  const soloUno = nuevos.length === 1;
  return {
    ...draft,
    nuevos,
    predeterminadoNuevoIndex: soloUno ? 0 : draft.predeterminadoNuevoIndex,
  };
}

export function actualizarNuevoDraft(
  draft: PuntosRecogidaDraft,
  index: number,
  punto: PuntoRecogidaInline,
): PuntosRecogidaDraft {
  return {
    ...draft,
    nuevos: draft.nuevos.map((p, i) => (i === index ? punto : p)),
  };
}

export function quitarNuevoDraft(draft: PuntosRecogidaDraft, index: number): PuntosRecogidaDraft {
  return {
    ...draft,
    nuevos: draft.nuevos.filter((_, i) => i !== index),
    predeterminadoNuevoIndex:
      draft.predeterminadoNuevoIndex === index
        ? undefined
        : draft.predeterminadoNuevoIndex != null && draft.predeterminadoNuevoIndex > index
          ? draft.predeterminadoNuevoIndex - 1
          : draft.predeterminadoNuevoIndex,
  };
}
