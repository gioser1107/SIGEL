export function nombreCompleto(
  nombre: string | null | undefined,
  apellido: string | null | undefined,
): string {
  return `${nombre?.trim() ?? ''} ${apellido?.trim() ?? ''}`.trim();
}
