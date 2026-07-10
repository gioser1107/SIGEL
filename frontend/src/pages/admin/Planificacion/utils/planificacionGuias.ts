import type { DatosViajeNuevo, GuiaDisponible, Viaje } from '../../../../types/viaje';

export function guiasDesdeViaje(viaje: Viaje): {
  guias_ids: number[];
  guia_principal_id: number | null;
} {
  if (viaje.guias?.length) {
    const guias_ids = viaje.guias.map((g) => g.id);
    const principal =
      viaje.guias.find((g) => g.es_principal)?.id ??
      viaje.guia_principal_id ??
      viaje.guia_id ??
      guias_ids[0] ??
      null;
    return { guias_ids, guia_principal_id: principal };
  }

  if (viaje.guia_id) {
    return { guias_ids: [viaje.guia_id], guia_principal_id: viaje.guia_id };
  }

  return { guias_ids: [], guia_principal_id: null };
}

export function etiquetaGuiasViaje(viaje: Viaje): string {
  const total = viaje.guias?.length ?? (viaje.guia_id ? 1 : 0);
  const principal = viaje.guia_principal_nombre ?? viaje.guia_nombre;

  if (!total || !principal) return 'Sin guía asignada';
  if (total === 1) return principal;
  return `${principal} (+${total - 1} más)`;
}

export function normalizarGuiasFormulario(form: DatosViajeNuevo): {
  guias_ids: number[];
  guia_principal_id: number | null;
  error: string | null;
} {
  const guias_ids = [...new Set(form.guias_ids ?? [])];
  let guia_principal_id = form.guia_principal_id ?? null;

  if (guias_ids.length === 0) {
    return { guias_ids: [], guia_principal_id: null, error: null };
  }

  if (guias_ids.length === 1) {
    return { guias_ids, guia_principal_id: guias_ids[0], error: null };
  }

  if (!guia_principal_id || !guias_ids.includes(guia_principal_id)) {
    return {
      guias_ids,
      guia_principal_id: null,
      error: 'Selecciona el guía principal cuando asignas más de uno.',
    };
  }

  return { guias_ids, guia_principal_id, error: null };
}

export function combinarOpcionesGuias(
  catalogo: GuiaDisponible[],
  viaje?: Viaje | null,
): { id: number; etiqueta: string }[] {
  const mapa = new Map<number, string>();
  for (const g of catalogo) {
    mapa.set(g.id, g.nombre);
  }
  for (const g of viaje?.guias ?? []) {
    if (!mapa.has(g.id)) mapa.set(g.id, g.nombre);
  }
  if (viaje?.guia_id && !mapa.has(viaje.guia_id)) {
    mapa.set(viaje.guia_id, viaje.guia_nombre ?? `Guía #${viaje.guia_id}`);
  }
  return [...mapa.entries()]
    .map(([id, etiqueta]) => ({ id, etiqueta }))
    .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, 'es'));
}

export function payloadViajeConGuias(form: DatosViajeNuevo): {
  payload: Omit<DatosViajeNuevo, 'guia_id'>;
  error: string | null;
} {
  const { guias_ids, guia_principal_id, error } = normalizarGuiasFormulario(form);
  if (error) return { payload: form, error };

  const { guia_id: _legacy, ...resto } = form;
  return {
    payload: {
      ...resto,
      guias_ids,
      guia_principal_id,
    },
    error: null,
  };
}
