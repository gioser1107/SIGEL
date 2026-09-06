import { useMemo, useState } from 'react';
import { CabeceraModulo, EtiquetaEstado, TablaDatos } from '../../../components/admin';
import type { Columna } from '../../../components/admin';
import Boton from '../../../components/ui/Boton/Boton';
import BtnImprimirReporte from '../../../components/ui/BtnImprimirReporte/BtnImprimirReporte';
import CabeceraReporteImpresion from '../../../components/ui/CabeceraReporteImpresion/CabeceraReporteImpresion';
import { etiquetaEstado } from '../../../utils/etiquetasNegocio';
import { formatearEuro } from '../../../utils/formatoMoneda';
import type {
  OcupacionViajeReporte,
  ReservaPeriodoReporte,
  ReservasDiaReporte,
} from '../../../types/reportesEstadisticos';
import { useReportesEstadisticos } from './hooks/useReportesEstadisticos';
import { fechaHoyIso } from '../../../utils/validacionesFormulario';
import '../Dashboard/Dashboard.css';
import './ReportesEstadisticos.css';

type TipoReporte =
  | 'gerencial'
  | 'destinos'
  | 'reservas'
  | 'ingresos'
  | 'clientes'
  | 'ocupacion'
  | 'cotizaciones';

const TIPOS: { id: TipoReporte; etiqueta: string }[] = [
  { id: 'gerencial', etiqueta: 'Gerencial' },
  { id: 'destinos', etiqueta: 'Destinos' },
  { id: 'reservas', etiqueta: 'Reservas y pasajeros' },
  { id: 'ingresos', etiqueta: 'Ingresos' },
  { id: 'clientes', etiqueta: 'Clientes' },
  { id: 'ocupacion', etiqueta: 'Ocupación' },
  { id: 'cotizaciones', etiqueta: 'Cotizaciones' },
];

const TITULO_TIPO: Record<TipoReporte, string> = {
  gerencial: 'Resumen gerencial',
  destinos: 'Destinos más concurridos',
  reservas: 'Reservas y pasajeros',
  ingresos: 'Ingresos cobrados',
  clientes: 'Clientes del periodo',
  ocupacion: 'Ocupación de viajes',
  cotizaciones: 'Cotizaciones',
};

function formatearFechaCorta(iso: string): string {
  const [anio, mes, dia] = iso.split('-');
  if (!anio || !mes || !dia) return iso;
  return `${dia}/${mes}/${anio}`;
}

function Kpi({
  etiqueta,
  valor,
  subtitulo,
  colorAcento = 'primary',
}: {
  etiqueta: string;
  valor: string | number;
  subtitulo?: string;
  colorAcento?: 'primary' | 'success' | 'warning' | 'info';
}) {
  return (
    <div className={`kpi-card kpi-card--${colorAcento}`}>
      <div className="kpi-card__contenido">
        <p className="kpi-card__etiqueta">{etiqueta}</p>
        <p className="kpi-card__valor">{valor}</p>
        {subtitulo && <p className="kpi-card__subtitulo">{subtitulo}</p>}
      </div>
    </div>
  );
}

function Barras({
  filas,
  vacio,
}: {
  filas: { clave: string | number; titulo: string; detalle?: string; valor: number; etiquetaValor: string }[];
  vacio: string;
}) {
  const maximo = Math.max(1, ...filas.map((f) => f.valor));
  if (filas.length === 0) {
    return <p className="dashboard__vacio">{vacio}</p>;
  }
  return (
    <div className="reportes-estadisticos__barras">
      {filas.map((fila) => (
        <div key={fila.clave} className="reportes-estadisticos__barra-fila">
          <div className="reportes-estadisticos__barra-meta">
            <span>{fila.titulo}</span>
            {fila.detalle && <span>{fila.detalle}</span>}
          </div>
          <div className="reportes-estadisticos__barra-pista">
            <div
              className="reportes-estadisticos__barra-valor"
              style={{ width: `${(fila.valor / maximo) * 100}%` }}
            />
          </div>
          <span className="reportes-estadisticos__barra-total">{fila.etiquetaValor}</span>
        </div>
      ))}
    </div>
  );
}

export default function ReportesEstadisticos() {
  const {
    desde,
    hasta,
    setDesde,
    setHasta,
    reporte,
    cargando,
    error,
    aplicarConsulta,
    aplicarAtajo,
  } = useReportesEstadisticos();
  const [tipo, setTipo] = useState<TipoReporte>('gerencial');

  const resumen = reporte?.resumen;
  const esUnSoloDia = desde === hasta;

  const columnasReservas: Columna<ReservaPeriodoReporte>[] = useMemo(
    () => [
      {
        id: 'fecha',
        encabezado: 'Fecha',
        accessor: (fila) => formatearFechaCorta(fila.fecha),
      },
      { id: 'destino', encabezado: 'Destino', accessor: (fila) => fila.destino },
      { id: 'pasajeros', encabezado: 'Pasajeros', accessor: (fila) => fila.pasajeros },
      {
        id: 'estado',
        encabezado: 'Estado',
        accessor: (fila) => <EtiquetaEstado etiqueta={fila.estado} />,
      },
    ],
    [],
  );

  const columnasDia: Columna<ReservasDiaReporte>[] = useMemo(
    () => [
      {
        id: 'fecha',
        encabezado: 'Día',
        accessor: (fila) => formatearFechaCorta(fila.fecha),
      },
      { id: 'reservas', encabezado: 'Reservas', accessor: (fila) => fila.reservas },
      { id: 'pasajeros', encabezado: 'Pasajeros', accessor: (fila) => fila.pasajeros },
    ],
    [],
  );

  const columnasOcupacion: Columna<OcupacionViajeReporte>[] = useMemo(
    () => [
      {
        id: 'fecha',
        encabezado: 'Salida',
        accessor: (fila) => (fila.fecha_salida ? formatearFechaCorta(fila.fecha_salida) : '—'),
      },
      { id: 'destino', encabezado: 'Destino', accessor: (fila) => fila.destino },
      {
        id: 'estado',
        encabezado: 'Estado',
        accessor: (fila) => <EtiquetaEstado etiqueta={fila.estado} />,
      },
      {
        id: 'cupo',
        encabezado: 'Cupo',
        accessor: (fila) => `${fila.asientos_ocupados} / ${fila.asientos_total}`,
      },
      {
        id: 'pct',
        encabezado: 'Ocupación',
        accessor: (fila) => `${fila.porcentaje} %`,
      },
    ],
    [],
  );

  return (
    <div className="reportes-estadisticos">
      <CabeceraModulo
        migaja="Administración / Reportes"
        titulo="Reportes estadísticos"
        acciones={
          <BtnImprimirReporte
            etiqueta="Imprimir reporte"
            deshabilitado={cargando || !reporte}
          />
        }
      />

      <div className="reportes-estadisticos__filtros no-imprimir">
        <div className="reportes-estadisticos__campo">
          <label htmlFor="reporte-desde">Desde</label>
          <input
            id="reporte-desde"
            type="date"
            min="2000-01-01"
            max={fechaHoyIso()}
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
          />
        </div>
        <div className="reportes-estadisticos__campo">
          <label htmlFor="reporte-hasta">Hasta</label>
          <input
            id="reporte-hasta"
            type="date"
            min="2000-01-01"
            max={fechaHoyIso()}
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
          />
        </div>
        <Boton variante="primario" tamano="sm" onClick={aplicarConsulta} disabled={cargando}>
          Consultar
        </Boton>
        <div className="reportes-estadisticos__atajos">
          <Boton variante="secundario" tamano="sm" onClick={() => aplicarAtajo('hoy')}>
            Hoy
          </Boton>
          <Boton variante="secundario" tamano="sm" onClick={() => aplicarAtajo('mes')}>
            Este mes
          </Boton>
          <Boton variante="secundario" tamano="sm" onClick={() => aplicarAtajo('anio')}>
            Este año
          </Boton>
        </div>
      </div>

      <div className="reportes-estadisticos__tipos no-imprimir" role="tablist" aria-label="Tipo de reporte">
        {TIPOS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tipo === item.id}
            className={`reportes-estadisticos__tipo ${tipo === item.id ? 'reportes-estadisticos__tipo--activo' : ''}`}
            onClick={() => setTipo(item.id)}
          >
            {item.etiqueta}
          </button>
        ))}
      </div>

      {reporte?.rango_disponible.desde && (
        <p className="reportes-estadisticos__rango">
          Datos del{' '}
          {formatearFechaCorta(reporte.rango_disponible.desde)} al{' '}
          {reporte.rango_disponible.hasta
            ? formatearFechaCorta(reporte.rango_disponible.hasta)
            : 'hoy'}
          .
        </p>
      )}

      {error && <div className="reportes-estadisticos__error">{error}</div>}

      <div className="zona-imprimible">
        {reporte && (
          <CabeceraReporteImpresion
            titulo={`${TITULO_TIPO[tipo]} — Travel BQTO`}
            filtroActivo={`${formatearFechaCorta(reporte.desde)} al ${formatearFechaCorta(reporte.hasta)}`}
            resumen={[
              { etiqueta: 'Clientes nuevos', valor: resumen?.clientes_nuevos ?? 0 },
              { etiqueta: 'Reservas', valor: resumen?.reservas ?? 0 },
              { etiqueta: 'Pasajeros', valor: resumen?.pasajeros ?? 0 },
              {
                etiqueta: 'Ingresos cobrados',
                valor: formatearEuro(resumen?.ingresos_aprobados_eur ?? 0),
              },
            ]}
          />
        )}

        {tipo === 'gerencial' && (
          <>
            <div className="dashboard__kpis">
              <Kpi
                etiqueta="Clientes nuevos"
                valor={cargando ? '…' : resumen?.clientes_nuevos ?? 0}
                subtitulo="fichas registradas en el periodo"
                colorAcento="info"
              />
              <Kpi
                etiqueta="Reservas"
                valor={cargando ? '…' : resumen?.reservas ?? 0}
                subtitulo={`${resumen?.reservas_activas ?? 0} activas · ${resumen?.reservas_canceladas ?? 0} canceladas`}
                colorAcento="primary"
              />
              <Kpi
                etiqueta="Pasajeros"
                valor={cargando ? '…' : resumen?.pasajeros ?? 0}
                subtitulo={`${resumen?.pasajeros_adultos ?? 0} adultos · ${resumen?.pasajeros_menores ?? 0} menores`}
                colorAcento="warning"
              />
              <Kpi
                etiqueta="Ingresos cobrados"
                valor={cargando ? '…' : formatearEuro(resumen?.ingresos_aprobados_eur ?? 0)}
                subtitulo={`${resumen?.pagos_aprobados ?? 0} pagos aprobados`}
                colorAcento="success"
              />
            </div>
            {reporte?.mes_mayor_movimiento && (
              <p className="reportes-estadisticos__destacado">
                Mes con más movimiento:{' '}
                <strong>{reporte.mes_mayor_movimiento.etiqueta}</strong>
                {' · '}
                {reporte.mes_mayor_movimiento.reservas} reservas,{' '}
                {reporte.mes_mayor_movimiento.pasajeros} pasajeros,{' '}
                {formatearEuro(reporte.mes_mayor_movimiento.ingresos_eur)} cobrados.
              </p>
            )}
            <div className="dashboard__panel dashboard__panel--ancho-completo">
              <div className="dashboard__panel-header">
                <h2 className="dashboard__panel-titulo">Movimiento por mes</h2>
              </div>
              <Barras
                vacio="No hay movimiento en el rango consultado."
                filas={(reporte?.movimiento_mensual ?? []).map((mes) => ({
                  clave: mes.mes,
                  titulo: mes.etiqueta,
                  detalle: `${mes.pasajeros} pasajeros · ${formatearEuro(mes.ingresos_eur)}`,
                  valor: mes.reservas,
                  etiquetaValor: String(mes.reservas),
                }))}
              />
            </div>
          </>
        )}

        {tipo === 'destinos' && (
          <div className="dashboard__fila-media">
            <div className="dashboard__panel">
              <div className="dashboard__panel-header">
                <h2 className="dashboard__panel-titulo">Destinos más reservados</h2>
              </div>
              <Barras
                vacio="Sin reservas activas en este rango."
                filas={(reporte?.destinos_mas_reservados ?? []).map((destino) => ({
                  clave: destino.id,
                  titulo: destino.nombre,
                  detalle: `${destino.pasajeros} pasajeros`,
                  valor: destino.reservas,
                  etiquetaValor: String(destino.reservas),
                }))}
              />
            </div>
            <div className="dashboard__panel">
              <div className="dashboard__panel-header">
                <h2 className="dashboard__panel-titulo">Destinos más cotizados</h2>
              </div>
              <Barras
                vacio="Sin cotizaciones en este rango."
                filas={(reporte?.destinos_mas_cotizados ?? []).map((destino) => ({
                  clave: destino.id,
                  titulo: destino.nombre,
                  valor: destino.cotizaciones,
                  etiquetaValor: String(destino.cotizaciones),
                }))}
              />
            </div>
          </div>
        )}

        {tipo === 'reservas' && (
          <>
            <div className="dashboard__kpis">
              <Kpi
                etiqueta="Reservas"
                valor={cargando ? '…' : resumen?.reservas ?? 0}
                subtitulo={`${resumen?.reservas_activas ?? 0} activas · ${resumen?.reservas_canceladas ?? 0} canceladas`}
              />
              <Kpi
                etiqueta="Pasajeros"
                valor={cargando ? '…' : resumen?.pasajeros ?? 0}
                subtitulo={`${resumen?.pasajeros_adultos ?? 0} adultos · ${resumen?.pasajeros_menores ?? 0} menores`}
                colorAcento="warning"
              />
            </div>
            <div className="dashboard__fila-media">
              <div className="dashboard__panel">
                <div className="dashboard__panel-header">
                  <h2 className="dashboard__panel-titulo">Reservas por estado</h2>
                </div>
                <Barras
                  vacio="Sin reservas en este rango."
                  filas={(reporte?.reservas_por_estado ?? []).map((item) => ({
                    clave: item.estado ?? 'estado',
                    titulo: etiquetaEstado(item.estado),
                    valor: item.total,
                    etiquetaValor: String(item.total),
                  }))}
                />
              </div>
              <div className="dashboard__panel">
                <div className="dashboard__panel-header">
                  <h2 className="dashboard__panel-titulo">Reservas por día</h2>
                </div>
                <TablaDatos
                  columnas={columnasDia}
                  datos={reporte?.reservas_por_dia ?? []}
                  cargando={cargando}
                  mensajeVacio="No hay reservas diarias en el rango."
                  idFila={(fila) => fila.fecha}
                />
              </div>
            </div>
            <div className="dashboard__panel dashboard__panel--ancho-completo">
              <div className="dashboard__panel-header">
                <h2 className="dashboard__panel-titulo">
                  {esUnSoloDia
                    ? `Reservas del ${formatearFechaCorta(desde)}`
                    : 'Reservas del periodo'}
                </h2>
              </div>
              <TablaDatos
                columnas={columnasReservas}
                datos={reporte?.reservas_del_periodo ?? []}
                cargando={cargando}
                mensajeVacio={
                  esUnSoloDia
                    ? 'No hay reservas en ese día.'
                    : 'No hay reservas en el rango seleccionado.'
                }
                idFila={(fila) => fila.id}
              />
            </div>
          </>
        )}

        {tipo === 'ingresos' && (
          <>
            <div className="dashboard__kpis">
              <Kpi
                etiqueta="Ingresos cobrados"
                valor={cargando ? '…' : formatearEuro(resumen?.ingresos_aprobados_eur ?? 0)}
                subtitulo="solo pagos aprobados, en euros"
                colorAcento="success"
              />
              <Kpi
                etiqueta="Pagos aprobados"
                valor={cargando ? '…' : resumen?.pagos_aprobados ?? 0}
                subtitulo={`${resumen?.pagos_periodo ?? 0} reportes en el periodo`}
                colorAcento="info"
              />
            </div>
            <div className="dashboard__fila-media">
              <div className="dashboard__panel">
                <div className="dashboard__panel-header">
                  <h2 className="dashboard__panel-titulo">Por método de pago</h2>
                </div>
                <Barras
                  vacio="Sin pagos aprobados en este rango."
                  filas={(reporte?.pagos_por_metodo ?? []).map((item) => ({
                    clave: item.metodo,
                    titulo: item.metodo,
                    detalle: `${item.pagos} pagos`,
                    valor: item.ingresos_eur,
                    etiquetaValor: formatearEuro(item.ingresos_eur),
                  }))}
                />
              </div>
              <div className="dashboard__panel">
                <div className="dashboard__panel-header">
                  <h2 className="dashboard__panel-titulo">Pagos por estado</h2>
                </div>
                <Barras
                  vacio="Sin pagos en este rango."
                  filas={(reporte?.pagos_por_estado ?? []).map((item) => ({
                    clave: item.estado ?? 'estado',
                    titulo: etiquetaEstado(item.estado),
                    valor: item.total,
                    etiquetaValor: String(item.total),
                  }))}
                />
              </div>
            </div>
            <div className="dashboard__panel dashboard__panel--ancho-completo">
              <div className="dashboard__panel-header">
                <h2 className="dashboard__panel-titulo">Ingresos por mes</h2>
              </div>
              <Barras
                vacio="No hay ingresos en el rango."
                filas={(reporte?.movimiento_mensual ?? []).map((mes) => ({
                  clave: mes.mes,
                  titulo: mes.etiqueta,
                  detalle: `${mes.reservas} reservas`,
                  valor: mes.ingresos_eur,
                  etiquetaValor: formatearEuro(mes.ingresos_eur),
                }))}
              />
            </div>
          </>
        )}

        {tipo === 'clientes' && (
          <>
            <div className="dashboard__kpis">
              <Kpi
                etiqueta="Clientes nuevos"
                valor={cargando ? '…' : resumen?.clientes_nuevos ?? 0}
                subtitulo="fichas creadas en el periodo"
                colorAcento="info"
              />
            </div>
            <div className="dashboard__panel dashboard__panel--ancho-completo">
              <div className="dashboard__panel-header">
                <h2 className="dashboard__panel-titulo">Por tipo de cliente</h2>
              </div>
              <Barras
                vacio="No hay clientes nuevos en este rango."
                filas={(reporte?.clientes_por_tipo ?? []).map((item) => ({
                  clave: item.tipo ?? 'tipo',
                  titulo: item.tipo === 'natural' ? 'Natural' : item.tipo === 'juridico' ? 'Jurídico' : item.tipo ?? '—',
                  valor: item.total,
                  etiquetaValor: String(item.total),
                }))}
              />
            </div>
          </>
        )}

        {tipo === 'ocupacion' && (
          <div className="dashboard__panel dashboard__panel--ancho-completo">
            <div className="dashboard__panel-header">
              <h2 className="dashboard__panel-titulo">Cupo de viajes con salida en el periodo</h2>
            </div>
            <TablaDatos
              columnas={columnasOcupacion}
              datos={reporte?.ocupacion_viajes ?? []}
              cargando={cargando}
              mensajeVacio="No hay viajes con fecha de salida en ese rango (hasta hoy)."
              idFila={(fila) => fila.id}
            />
          </div>
        )}

        {tipo === 'cotizaciones' && (
          <>
            <div className="dashboard__kpis">
              <Kpi
                etiqueta="Cotizaciones"
                valor={cargando ? '…' : resumen?.cotizaciones ?? 0}
                subtitulo={`${resumen?.cotizaciones_aceptadas ?? 0} aceptadas`}
                colorAcento="primary"
              />
              <Kpi
                etiqueta="Conversión"
                valor={cargando ? '…' : `${resumen?.conversion_cotizaciones_pct ?? 0} %`}
                subtitulo="aceptadas sobre el total del periodo"
                colorAcento="success"
              />
            </div>
            <div className="dashboard__fila-media">
              <div className="dashboard__panel">
                <div className="dashboard__panel-header">
                  <h2 className="dashboard__panel-titulo">Por estado</h2>
                </div>
                <Barras
                  vacio="Sin cotizaciones en este rango."
                  filas={(reporte?.cotizaciones_por_estado ?? []).map((item) => ({
                    clave: item.estado ?? 'estado',
                    titulo: etiquetaEstado(item.estado),
                    valor: item.total,
                    etiquetaValor: String(item.total),
                  }))}
                />
              </div>
              <div className="dashboard__panel">
                <div className="dashboard__panel-header">
                  <h2 className="dashboard__panel-titulo">Destinos más cotizados</h2>
                </div>
                <Barras
                  vacio="Sin cotizaciones en este rango."
                  filas={(reporte?.destinos_mas_cotizados ?? []).map((destino) => ({
                    clave: destino.id,
                    titulo: destino.nombre,
                    valor: destino.cotizaciones,
                    etiquetaValor: String(destino.cotizaciones),
                  }))}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
