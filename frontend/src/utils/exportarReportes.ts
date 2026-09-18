import { etiquetaEstado } from './etiquetasNegocio';
import { descargarExcel, type HojaExcel } from './exportarExcel';
import { nombreCompleto } from './nombrePersona';
import type { DomicilioManifiesto } from '../types/abordaje';
import type { ReporteEstadistico } from '../types/reportesEstadisticos';
import type { ReporteViaje } from '../types/viajeReporte';

function formatearFechaSalida(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatearDocumento(tipo: string, numero: string): string {
  return `${tipo}-${numero}`.trim();
}

function formatearDomicilio(domicilio: DomicilioManifiesto | null | undefined): string {
  if (!domicilio) return '—';
  const partes = [domicilio.nombre, domicilio.direccion, domicilio.ciudad].filter(Boolean);
  return partes.length > 0 ? partes.join(' · ') : '—';
}

function formatearAsiento(numero: string | undefined, posicion?: string | null): string {
  if (!numero) return '—';
  return posicion ? `${numero} (${posicion})` : numero;
}

function hoja(nombre: string, encabezados: string[], filas: (string | number | null | undefined)[][]): HojaExcel {
  return { nombre, filas: [encabezados, ...filas] };
}

function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}

function slugArchivo(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40) || 'reporte';
}

export function exportarEstadisticoExcel(reporte: ReporteEstadistico, tipo: string): void {
  const r = reporte.resumen;
  const hojas: HojaExcel[] = [
    hoja(
      'Resumen',
      ['Indicador', 'Valor'],
      [
        ['Desde', reporte.desde],
        ['Hasta', reporte.hasta],
        ['Clientes nuevos', r.clientes_nuevos],
        ['Reservas', r.reservas],
        ['Reservas activas', r.reservas_activas],
        ['Reservas canceladas', r.reservas_canceladas],
        ['Pasajeros', r.pasajeros],
        ['Pasajeros adultos', r.pasajeros_adultos],
        ['Pasajeros menores', r.pasajeros_menores],
        ['Cotizaciones', r.cotizaciones],
        ['Cotizaciones aceptadas', r.cotizaciones_aceptadas],
        ['Conversión cotizaciones %', r.conversion_cotizaciones_pct],
        ['Ingresos cobrados EUR', redondear(r.ingresos_aprobados_eur)],
        ['Pagos aprobados', r.pagos_aprobados],
        ['Pagos del periodo', r.pagos_periodo],
        [
          'Mes con más movimiento',
          reporte.mes_mayor_movimiento
            ? `${reporte.mes_mayor_movimiento.etiqueta} (${reporte.mes_mayor_movimiento.reservas} reservas)`
            : '—',
        ],
      ],
    ),
    hoja(
      'Movimiento mensual',
      ['Mes', 'Reservas', 'Pasajeros', 'Ingresos EUR'],
      reporte.movimiento_mensual.map((mes) => [
        mes.etiqueta,
        mes.reservas,
        mes.pasajeros,
        redondear(mes.ingresos_eur),
      ]),
    ),
    hoja(
      'Destinos reservados',
      ['Destino', 'Reservas', 'Pasajeros'],
      reporte.destinos_mas_reservados.map((d) => [d.nombre, d.reservas, d.pasajeros]),
    ),
    hoja(
      'Destinos cotizados',
      ['Destino', 'Cotizaciones'],
      reporte.destinos_mas_cotizados.map((d) => [d.nombre, d.cotizaciones]),
    ),
    hoja(
      'Reservas del periodo',
      ['Fecha', 'Destino', 'Pasajeros', 'Estado'],
      reporte.reservas_del_periodo.map((fila) => [
        fila.fecha,
        fila.destino,
        fila.pasajeros,
        etiquetaEstado(fila.estado),
      ]),
    ),
    hoja(
      'Reservas por dia',
      ['Fecha', 'Reservas', 'Pasajeros'],
      reporte.reservas_por_dia.map((fila) => [fila.fecha, fila.reservas, fila.pasajeros]),
    ),
    hoja(
      'Reservas por estado',
      ['Estado', 'Total'],
      reporte.reservas_por_estado.map((fila) => [etiquetaEstado(fila.estado), fila.total]),
    ),
    hoja(
      'Pagos por metodo',
      ['Método', 'Pagos', 'Ingresos EUR'],
      reporte.pagos_por_metodo.map((fila) => [fila.metodo, fila.pagos, redondear(fila.ingresos_eur)]),
    ),
    hoja(
      'Pagos por estado',
      ['Estado', 'Total'],
      reporte.pagos_por_estado.map((fila) => [etiquetaEstado(fila.estado), fila.total]),
    ),
    hoja(
      'Clientes por tipo',
      ['Tipo', 'Total'],
      reporte.clientes_por_tipo.map((fila) => [
        fila.tipo === 'natural' ? 'Natural' : fila.tipo === 'juridico' ? 'Jurídico' : fila.tipo ?? '—',
        fila.total,
      ]),
    ),
    hoja(
      'Ocupacion de viajes',
      ['Salida', 'Destino', 'Estado', 'Ocupados', 'Cupo', 'Ocupación %'],
      reporte.ocupacion_viajes.map((fila) => [
        fila.fecha_salida,
        fila.destino,
        etiquetaEstado(fila.estado),
        fila.asientos_ocupados,
        fila.asientos_total,
        fila.porcentaje,
      ]),
    ),
    hoja(
      'Cotizaciones por estado',
      ['Estado', 'Total'],
      reporte.cotizaciones_por_estado.map((fila) => [etiquetaEstado(fila.estado), fila.total]),
    ),
  ];

  descargarExcel(
    hojas,
    `TravelBQTO_${slugArchivo(tipo)}_${reporte.desde}_${reporte.hasta}.xlsx`,
  );
}

function etiquetaPagoViaje(pagado: boolean, saldo: number, validacion: number): string {
  if (pagado) return 'Pagado completo';
  if (saldo > 0.01) return `Saldo ${redondear(saldo)}`;
  if (validacion > 0) return `En validación ${redondear(validacion)}`;
  return 'Sin pagos';
}

export function exportarListinExcel(reporte: ReporteViaje): void {
  const destino = reporte.viaje.destino_nombre ?? 'viaje';
  const salida = reporte.viaje.fecha_salida ?? '';
  const hojas: HojaExcel[] = [
    hoja(
      'Resumen',
      ['Campo', 'Valor'],
      [
        ['Destino', destino],
        ['Salida', formatearFechaSalida(reporte.viaje.fecha_salida)],
        ['Unidad', reporte.viaje.unidad_placa ?? '—'],
        ['Guía', reporte.viaje.guia_nombre ?? '—'],
        ['Estado', etiquetaEstado(reporte.viaje.estado)],
        ['Pasajeros', reporte.resumen.total_pasajeros],
        ['Reservas', reporte.resumen.total_reservas],
        ['Asientos ocupados', reporte.ocupacion.total_ocupados],
        ['Cupo', reporte.ocupacion.total_asientos],
        ['Cobrado EUR', redondear(reporte.resumen.total_cobrado_eur)],
        ['Saldo pendiente EUR', redondear(reporte.resumen.saldo_pendiente_eur)],
        ['Reservas pagadas', reporte.resumen.reservas_pagadas_completas],
      ],
    ),
    hoja(
      'Pasajeros',
      [
        'Pasajero',
        'Titular',
        'Menor',
        'Documento',
        'Teléfono',
        'Reserva',
        'Estado reserva',
        'Asiento',
        'Recogida',
        'Estado de pago',
        'Total EUR',
        'Pagado EUR',
        'Saldo EUR',
      ],
      reporte.pasajeros.map((p) => [
        nombreCompleto(p.cliente.nombre, p.cliente.apellido),
        p.es_titular ? 'Sí' : 'No',
        p.es_menor ? 'Sí' : 'No',
        formatearDocumento(p.cliente.tipo_documento, p.cliente.numero_documento),
        p.cliente.telefono ?? '—',
        `RES-${String(p.reserva_id).padStart(5, '0')}`,
        etiquetaEstado(p.reserva_estado),
        p.ocupa_asiento === false
          ? 'Sin asiento'
          : formatearAsiento(p.asiento?.numero, p.asiento?.posicion),
        formatearDomicilio(p.domicilio),
        etiquetaPagoViaje(
          p.resumen_pagos.pagado_completo,
          p.resumen_pagos.saldo_pendiente_eur,
          p.resumen_pagos.total_pendiente_validacion_eur,
        ),
        redondear(p.resumen_pagos.total_reserva_eur),
        redondear(p.resumen_pagos.total_pagado_aprobado_eur),
        redondear(p.resumen_pagos.saldo_pendiente_eur),
      ]),
    ),
    hoja(
      'Reservas',
      ['Reserva', 'Estado', 'Fecha', 'Titular', 'Pasajeros', 'Total EUR', 'Pagado EUR', 'Saldo EUR'],
      reporte.reservas.map((res) => [
        `RES-${String(res.id).padStart(5, '0')}`,
        etiquetaEstado(res.estado),
        res.fecha_reserva,
        res.titular ? nombreCompleto(res.titular.nombre, res.titular.apellido) : '—',
        res.cantidad_pasajeros,
        redondear(res.resumen_pagos.total_reserva_eur),
        redondear(res.resumen_pagos.total_pagado_aprobado_eur),
        redondear(res.resumen_pagos.saldo_pendiente_eur),
      ]),
    ),
  ];

  descargarExcel(
    hojas,
    `TravelBQTO_listin_${slugArchivo(destino)}_${slugArchivo(salida)}.xlsx`,
  );
}
