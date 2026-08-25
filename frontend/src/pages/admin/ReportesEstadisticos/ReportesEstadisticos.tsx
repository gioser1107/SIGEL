import { useMemo } from 'react';
import { CabeceraModulo, EtiquetaEstado, TablaDatos } from '../../../components/admin';
import type { Columna } from '../../../components/admin';
import Boton from '../../../components/ui/Boton/Boton';
import BtnImprimirReporte from '../../../components/ui/BtnImprimirReporte/BtnImprimirReporte';
import CabeceraReporteImpresion from '../../../components/ui/CabeceraReporteImpresion/CabeceraReporteImpresion';
import { formatearEuro } from '../../../utils/formatoMoneda';
import type { ReservaPeriodoReporte } from '../../../types/reportesEstadisticos';
import { useReportesEstadisticos } from './hooks/useReportesEstadisticos';
import '../Dashboard/Dashboard.css';
import './ReportesEstadisticos.css';

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

  const resumen = reporte?.resumen;
  const maxReservasDestino = reporte?.destinos_mas_reservados[0]?.reservas ?? 1;
  const maxCotizaciones = reporte?.destinos_mas_cotizados[0]?.cotizaciones ?? 1;
  const maxReservasMes = Math.max(1, ...(reporte?.movimiento_mensual.map((m) => m.reservas) ?? [1]));

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

  const esUnSoloDia = desde === hasta;

  return (
    <div className="reportes-estadisticos">
      <CabeceraModulo
        migaja="Administración"
        titulo="Reportes estadísticos"
        descripcion="Indicadores del negocio en un rango de fechas reales: clientes, destinos más concurridos, mes con más movimiento e ingresos cobrados."
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
            max="2027-12-31"
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
            max="2027-12-31"
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

      {reporte?.rango_disponible.desde && (
        <p className="reportes-estadisticos__rango">
          Datos reales en el sistema:{' '}
          {formatearFechaCorta(reporte.rango_disponible.desde)} —{' '}
          {reporte.rango_disponible.hasta
            ? formatearFechaCorta(reporte.rango_disponible.hasta)
            : 'hoy'}
          . El año 500 u otras fechas imposibles no se aceptan.
        </p>
      )}

      {error && <div className="reportes-estadisticos__error">{error}</div>}

      <div className="zona-imprimible">
        {reporte && (
          <CabeceraReporteImpresion
            titulo="Reportes estadísticos — Travel BQTO"
            subtitulo="Apoyo a la toma de decisiones del dueño de la agencia"
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

        {reporte?.limitaciones.nota && (
          <p className="reportes-estadisticos__nota">{reporte.limitaciones.nota}</p>
        )}

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

        <div className="dashboard__fila-media">
          <div className="dashboard__panel">
            <div className="dashboard__panel-header">
              <h2 className="dashboard__panel-titulo">Destinos más reservados</h2>
            </div>
            {!reporte || reporte.destinos_mas_reservados.length === 0 ? (
              <p className="dashboard__vacio">Sin reservas activas en este rango.</p>
            ) : (
              <div className="reportes-estadisticos__barras">
                {reporte.destinos_mas_reservados.map((destino) => (
                  <div key={destino.id} className="reportes-estadisticos__barra-fila">
                    <div className="reportes-estadisticos__barra-meta">
                      <span>{destino.nombre}</span>
                      <span>{destino.pasajeros} pasajeros</span>
                    </div>
                    <div className="reportes-estadisticos__barra-pista">
                      <div
                        className="reportes-estadisticos__barra-valor"
                        style={{ width: `${(destino.reservas / maxReservasDestino) * 100}%` }}
                      />
                    </div>
                    <span className="reportes-estadisticos__barra-total">{destino.reservas}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="dashboard__panel">
            <div className="dashboard__panel-header">
              <h2 className="dashboard__panel-titulo">Destinos más cotizados</h2>
            </div>
            {!reporte || reporte.destinos_mas_cotizados.length === 0 ? (
              <p className="dashboard__vacio">Sin cotizaciones en este rango.</p>
            ) : (
              <div className="reportes-estadisticos__barras">
                {reporte.destinos_mas_cotizados.map((destino) => (
                  <div key={destino.id} className="reportes-estadisticos__barra-fila">
                    <div className="reportes-estadisticos__barra-meta">
                      <span>{destino.nombre}</span>
                    </div>
                    <div className="reportes-estadisticos__barra-pista">
                      <div
                        className="reportes-estadisticos__barra-valor"
                        style={{ width: `${(destino.cotizaciones / maxCotizaciones) * 100}%` }}
                      />
                    </div>
                    <span className="reportes-estadisticos__barra-total">{destino.cotizaciones}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="dashboard__panel dashboard__panel--ancho-completo">
          <div className="dashboard__panel-header">
            <h2 className="dashboard__panel-titulo">Movimiento por mes</h2>
          </div>
          {!reporte || reporte.movimiento_mensual.length === 0 ? (
            <p className="dashboard__vacio">No hay movimiento en el rango consultado.</p>
          ) : (
            <div className="reportes-estadisticos__barras">
              {reporte.movimiento_mensual.map((mes) => (
                <div key={mes.mes} className="reportes-estadisticos__barra-fila">
                  <div className="reportes-estadisticos__barra-meta">
                    <span>{mes.etiqueta}</span>
                    <span>
                      {mes.pasajeros} pasajeros · {formatearEuro(mes.ingresos_eur)}
                    </span>
                  </div>
                  <div className="reportes-estadisticos__barra-pista">
                    <div
                      className="reportes-estadisticos__barra-valor"
                      style={{ width: `${(mes.reservas / maxReservasMes) * 100}%` }}
                    />
                  </div>
                  <span className="reportes-estadisticos__barra-total">{mes.reservas}</span>
                </div>
              ))}
            </div>
          )}
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
      </div>
    </div>
  );
}
