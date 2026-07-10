// Convierte la fecha ISO a formato legible dd/mm/aaaa hh:mm (zona VE)
export function formatFecha(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })
  );
}

// Formatea hora ISO o cadena HH:mm[:ss] para la tabla de paradas
export function formatHora(iso: string): string {
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(iso)) {
    return iso.slice(0, 5);
  }
  return new Date(iso).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
}

/** Combina la fecha del viaje con una hora HH:mm para el API (datetime ISO). */
export function combinarHoraConFechaSalida(fechaSalida: string, hora: string): string {
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(hora)) {
    return hora.length === 16 ? `${hora}:00` : hora;
  }
  const dia = fechaSalida.slice(0, 10);
  const [h, m = '00'] = hora.split(':');
  return `${dia}T${h.padStart(2, '0')}:${m.padStart(2, '0')}:00`;
}
