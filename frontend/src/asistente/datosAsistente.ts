import type { ReporteEstadistico } from '../types/reportesEstadisticos';
import type { EnlaceAsistente } from './tipos';

export interface ContextoAsistente {
  reporteAnio?: ReporteEstadistico | null;
  reporteMes?: ReporteEstadistico | null;
  mesConsultado?: { numero: number; nombre: string; anio: number } | null;
}

export interface RespuestaAsistente {
  texto: string;
  enlaces?: EnlaceAsistente[];
}

const MESES: { nombre: string; aliases: string[]; numero: number }[] = [
  { nombre: 'enero', aliases: ['enero'], numero: 1 },
  { nombre: 'febrero', aliases: ['febrero'], numero: 2 },
  { nombre: 'marzo', aliases: ['marzo'], numero: 3 },
  { nombre: 'abril', aliases: ['abril'], numero: 4 },
  { nombre: 'mayo', aliases: ['mayo'], numero: 5 },
  { nombre: 'junio', aliases: ['junio'], numero: 6 },
  { nombre: 'julio', aliases: ['julio'], numero: 7 },
  { nombre: 'agosto', aliases: ['agosto'], numero: 8 },
  { nombre: 'septiembre', aliases: ['septiembre', 'setiembre'], numero: 9 },
  { nombre: 'octubre', aliases: ['octubre'], numero: 10 },
  { nombre: 'noviembre', aliases: ['noviembre'], numero: 11 },
  { nombre: 'diciembre', aliases: ['diciembre'], numero: 12 },
];

export function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function detectarMes(pregunta: string): { numero: number; nombre: string } | null {
  const n = normalizarTexto(pregunta);
  for (const mes of MESES) {
    if (mes.aliases.some((alias) => n.includes(alias))) {
      return { numero: mes.numero, nombre: mes.nombre };
    }
  }
  return null;
}

/** Si el mes aún no cierra este año, usa el mismo mes del año anterior. */
export function rangoMesHistorico(numeroMes: number, hoy = new Date()): { desde: string; hasta: string; anio: number } {
  const anioHoy = hoy.getFullYear();
  const mesHoy = hoy.getMonth() + 1;
  const anio = numeroMes >= mesHoy ? anioHoy - 1 : anioHoy;
  const ultimoDia = new Date(anio, numeroMes, 0).getDate();
  const mm = String(numeroMes).padStart(2, '0');
  return {
    desde: `${anio}-${mm}-01`,
    hasta: `${anio}-${mm}-${String(ultimoDia).padStart(2, '0')}`,
    anio,
  };
}

function euro(n: number): string {
  return `€ ${n.toLocaleString('es-VE', { maximumFractionDigits: 0 })}`;
}

function esPreguntaDatos(pregunta: string): boolean {
  const n = normalizarTexto(pregunta);
  const claves = [
    'cuantos', 'cuantas', 'numero', 'numeros', 'reporte', 'estadistic',
    'destino', 'conviene', 'recomienda', 'recomend', 'diciembre', 'enero',
    'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
    'septiembre', 'octubre', 'noviembre', 'ocupacion', 'ingreso', 'venta',
    'clientes nuevos', 'pasajero', 'pico', 'demanda', 'rentab', 'equilibrio',
    'sacar', 'programar', 'mejor destino', 'top',
  ];
  return claves.some((c) => n.includes(c));
}

export function responderConDatos(pregunta: string, ctx: ContextoAsistente): string | null {
  if (!esPreguntaDatos(pregunta)) return null;

  const n = normalizarTexto(pregunta);
  const anio = ctx.reporteAnio;
  const mes = ctx.reporteMes;
  const etiquetaMes = ctx.mesConsultado
    ? `${ctx.mesConsultado.nombre} ${ctx.mesConsultado.anio}`
    : null;

  if ((n.includes('conviene') || n.includes('sacar') || n.includes('programar') || n.includes('recomienda') || n.includes('mejor destino')) && mes) {
    const top = mes.destinos_mas_reservados[0];
    const segundo = mes.destinos_mas_reservados[1];
    const cotizado = mes.destinos_mas_cotizados[0];
    if (!top) {
      return `No hay reservas registradas en ${etiquetaMes ?? 'ese mes'} para recomendar un destino. Cuando haya movimiento, aquí verás el que más conviene sacar.`;
    }
    const extra = segundo
      ? ` Como alternativa aparece ${segundo.nombre} (${segundo.reservas} reservas).`
      : '';
    const cotizacion = cotizado
      ? ` En cotizaciones el más pedido fue ${cotizado.nombre} (${cotizado.cotizaciones}).`
      : '';
    return (
      `Para ${etiquetaMes}, el destino con más movimiento fue ${top.nombre}: ` +
      `${top.reservas} reservas y ${top.pasajeros} pasajeros (${euro(mes.resumen.ingresos_aprobados_eur)} en ingresos aprobados). ` +
      `Conviene priorizar ese destino al armar la oferta.${extra}${cotizacion}`
    );
  }

  if (mes && (n.includes('diciembre') || detectarMes(pregunta))) {
    const top = mes.destinos_mas_reservados.slice(0, 3);
    const lista = top.map((d) => `${d.nombre} (${d.reservas} reservas, ${d.pasajeros} pax)`).join('; ') || 'sin destinos con reservas';
    return (
      `En ${etiquetaMes}: ${mes.resumen.reservas} reservas, ${mes.resumen.pasajeros} pasajeros, ` +
      `${mes.resumen.clientes_nuevos} clientes nuevos e ingresos ${euro(mes.resumen.ingresos_aprobados_eur)}. ` +
      `Destinos: ${lista}.`
    );
  }

  if (!anio) {
    return 'Aún no pude leer los reportes. Revisa que tu rol tenga permiso de reportes o entra a Reportes → Estadísticos.';
  }

  if (n.includes('cliente')) {
    const tipos = anio.clientes_por_tipo.map((t) => `${t.tipo}: ${t.total}`).join(', ');
    return `Este año se registraron ${anio.resumen.clientes_nuevos} clientes nuevos (${tipos || 'sin desglose'}). Periodo ${anio.desde} a ${anio.hasta}.`;
  }

  if (n.includes('ingreso') || n.includes('venta') || n.includes('cobr')) {
    const metodo = anio.pagos_por_metodo[0];
    return (
      `Ingresos aprobados del año: ${euro(anio.resumen.ingresos_aprobados_eur)} ` +
      `en ${anio.resumen.pagos_aprobados} pagos. ` +
      (metodo ? `El método con más cobro es ${metodo.metodo} (${euro(metodo.ingresos_eur)}).` : '')
    );
  }

  if (n.includes('ocupacion') || n.includes('cupo') || n.includes('asiento')) {
    const baja = anio.ocupacion_viajes.filter((v) => v.asientos_total > 0 && v.porcentaje < 50).slice(0, 3);
    const alta = [...anio.ocupacion_viajes].sort((a, b) => b.porcentaje - a.porcentaje)[0];
    const textoAlta = alta ? `El más lleno es ${alta.destino} (${alta.porcentaje}%).` : '';
    const textoBaja = baja.length
      ? ` Atención, ocupación baja: ${baja.map((v) => `${v.destino} ${v.porcentaje}%`).join('; ')}.`
      : '';
    return `${textoAlta}${textoBaja}`.trim() || 'No hay viajes con cupo calculado en el periodo.';
  }

  if (n.includes('destino') || n.includes('recomienda')) {
    const top = anio.destinos_mas_reservados.slice(0, 3);
    if (!top.length) return 'Todavía no hay destinos con reservas este año.';
    return `Los destinos con más reservas del año: ${top.map((d) => `${d.nombre} (${d.reservas} reservas)`).join(', ')}.`;
  }

  if (n.includes('pico') || n.includes('demanda') || n.includes('temporada')) {
    const pico = anio.mes_mayor_movimiento;
    if (!pico) return 'Aún no hay serie mensual para estimar demanda.';
    return `El mes de mayor movimiento fue ${pico.etiqueta}: ${pico.reservas} reservas, ${pico.pasajeros} pasajeros e ingresos ${euro(pico.ingresos_eur)}.`;
  }

  if (n.includes('reserva') || n.includes('pasajero') || n.includes('cuantos') || n.includes('reporte')) {
    return (
      `Resumen del año (${anio.desde} a ${anio.hasta}): ` +
      `${anio.resumen.reservas} reservas (${anio.resumen.reservas_activas} activas, ${anio.resumen.reservas_canceladas} canceladas), ` +
      `${anio.resumen.pasajeros} pasajeros, ${anio.resumen.clientes_nuevos} clientes nuevos, ` +
      `${anio.resumen.cotizaciones} cotizaciones (${anio.resumen.conversion_cotizaciones_pct}% de conversión) ` +
      `e ingresos ${euro(anio.resumen.ingresos_aprobados_eur)}.`
    );
  }

  return null;
}
