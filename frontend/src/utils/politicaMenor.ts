export const EDAD_MIN_MENOR = 1;
export const EDAD_MAX_MENOR = 17;
export const EDAD_MAX_PIERNAS = 5;

export function edadDesdeFecha(fecha: string, referencia = new Date()): number | null {
  if (!fecha) return null;
  const nacimiento = new Date(`${fecha.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(nacimiento.getTime())) return null;
  let edad = referencia.getFullYear() - nacimiento.getFullYear();
  const mes = referencia.getMonth() - nacimiento.getMonth();
  if (mes < 0 || (mes === 0 && referencia.getDate() < nacimiento.getDate())) {
    edad -= 1;
  }
  return edad;
}

export function resolverPoliticaMenor(
  esMenor: boolean,
  fechaNacimiento: string,
  ocupaAsiento?: boolean | null,
): { es_menor: boolean; ocupa_asiento: boolean; enPiernas: boolean; edad: number | null } {
  if (!esMenor) {
    return {
      es_menor: false,
      ocupa_asiento: ocupaAsiento ?? true,
      enPiernas: false,
      edad: null,
    };
  }

  const edad = edadDesdeFecha(fechaNacimiento);
  const enPiernas = edad != null && edad >= EDAD_MIN_MENOR && edad <= EDAD_MAX_PIERNAS;
  let ocupa = ocupaAsiento;
  if (ocupa == null) {
    ocupa = !enPiernas;
  }
  if (edad != null && edad > EDAD_MAX_PIERNAS) {
    ocupa = true;
  }

  return {
    es_menor: true,
    ocupa_asiento: Boolean(ocupa),
    enPiernas,
    edad,
  };
}

export function recargoMenorEstimado(
  esMenor: boolean,
  fechaNacimiento: string,
  recargoDestinoEur: number,
  ocupaAsiento?: boolean | null,
): number {
  const politica = resolverPoliticaMenor(esMenor, fechaNacimiento, ocupaAsiento);
  if (!politica.es_menor || politica.ocupa_asiento) return 0;
  return recargoDestinoEur;
}

export function errorPoliticaMenor(
  esMenor: boolean,
  fechaNacimiento: string,
  partidaUrl: string | null,
): string | null {
  if (!esMenor) return null;
  if (!fechaNacimiento) return 'Los menores deben registrar fecha de nacimiento.';
  const edad = edadDesdeFecha(fechaNacimiento);
  if (edad == null) return 'La fecha de nacimiento no es válida.';
  if (edad < EDAD_MIN_MENOR || edad > EDAD_MAX_MENOR) {
    return 'Solo se registran como menores a niños de 1 a 17 años.';
  }
  if (!partidaUrl) return 'Debes adjuntar la partida de nacimiento del menor.';
  return null;
}
