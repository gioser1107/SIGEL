export function nombreCompleto(
  nombre: string | null | undefined,
  apellido: string | null | undefined,
): string {
  return `${nombre?.trim() ?? ''} ${apellido?.trim() ?? ''}`.trim();
}

/** Nombre para pantallas: persona natural, o razón social si es empresa. */
export function nombreVisiblePersona(datos: {
  nombre?: string | null;
  apellido?: string | null;
  razon_social?: string | null;
  tipo_cliente?: string | null;
}): string {
  const razon = datos.razon_social?.trim() ?? '';
  if (datos.tipo_cliente === 'juridico' && razon) return razon;
  return nombreCompleto(datos.nombre, datos.apellido) || razon;
}
