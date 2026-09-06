import { Link } from 'react-router-dom';
import { EtiquetaEstado, resolverVariante } from '../../../components/admin';
import { useDashboardAdmin } from '../../../hooks/useDashboardAdmin';
import { SIN_DATO, textoVisible } from '../../../utils/etiquetasNegocio';
import './Dashboard.css';

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatHora(iso: string) {
  return new Date(iso).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
}

function KpiCard({
  etiqueta,
  valor,
  subtitulo,
  icono,
  colorAcento = 'primary',
}: {
  etiqueta: string;
  valor: string | number;
  subtitulo?: string;
  icono: React.ReactNode;
  colorAcento?: 'primary' | 'success' | 'warning' | 'info';
}) {
  return (
    <div className={`kpi-card kpi-card--${colorAcento}`}>
      <div className="kpi-card__icono" aria-hidden="true">{icono}</div>
      <div className="kpi-card__contenido">
        <p className="kpi-card__etiqueta">{etiqueta}</p>
        <p className="kpi-card__valor">{valor}</p>
        {subtitulo && <p className="kpi-card__subtitulo">{subtitulo}</p>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const {
    viajesActivos,
    cotizacionesPendientes,
    proximasSalidas,
    montoCotizacionesActivas,
    proximosViajes,
    cotizacionesRecientes,
    destinosTop,
    cargando,
    error,
  } = useDashboardAdmin();

  const maxTop = destinosTop[0]?.total ?? 1;

  if (error) {
    return (
      <div className="dashboard__error" role="alert">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        {error}
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* ─── KPIs ─── */}
      <div className="dashboard__kpis">
        <KpiCard
          etiqueta="Viajes activos"
          valor={cargando ? '…' : viajesActivos}
          subtitulo="planificados + en curso"
          colorAcento="primary"
          icono={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="3" width="15" height="13" rx="2" /><path d="M16 8h4l3 3v5a2 2 0 0 1-2 2h-1" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
          }
        />
        <KpiCard
          etiqueta="Cotizaciones pendientes"
          valor={cargando ? '…' : cotizacionesPendientes}
          subtitulo="solicitadas + pendientes"
          colorAcento="warning"
          icono={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          }
        />
        <KpiCard
          etiqueta="Salidas próximas"
          valor={cargando ? '…' : proximasSalidas}
          subtitulo="en los próximos 7 días"
          colorAcento="info"
          icono={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          }
        />
        <KpiCard
          etiqueta="Monto en cotizaciones activas"
          valor={cargando ? '…' : `€ ${montoCotizacionesActivas.toLocaleString('es-ES', { minimumFractionDigits: 0 })}`}
          subtitulo="solicitadas, pendientes y aceptadas"
          colorAcento="success"
          icono={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
        />
      </div>

      {/* ─── Fila media ─── */}
      <div className="dashboard__fila-media">
        {/* Viajes próximos */}
        <div className="dashboard__panel">
          <div className="dashboard__panel-header">
            <h2 className="dashboard__panel-titulo">Viajes próximos</h2>
            <Link to="/admin/planificacion" className="dashboard__panel-link">
              Ver planificación →
            </Link>
          </div>
          {cargando ? (
            <div className="dashboard__skeleton-lista">
              {[1, 2, 3].map((i) => <div key={i} className="dashboard__skeleton-row" />)}
            </div>
          ) : proximosViajes.length === 0 ? (
            <p className="dashboard__vacio">No hay viajes en los próximos 7 días.</p>
          ) : (
            <div className="dashboard__viajes-lista">
              {proximosViajes.map((v) => (
                <div key={v.id} className="dashboard__viaje-fila">
                  <div className="dashboard__viaje-fecha">
                    <span className="dashboard__viaje-dia">
                      {new Date(v.fecha_salida).toLocaleDateString('es-VE', { day: '2-digit', month: 'short' })}
                    </span>
                    <span className="dashboard__viaje-hora">{formatHora(v.fecha_salida)}</span>
                  </div>
                  <div className="dashboard__viaje-info">
                    <span className="dashboard__viaje-destino">{textoVisible(v.destino_nombre, SIN_DATO.destino)}</span>
                    <span className="dashboard__viaje-unidad">{textoVisible(v.unidad_placa, SIN_DATO.unidad)}</span>
                  </div>
                  <EtiquetaEstado etiqueta={v.estado} variante={resolverVariante(v.estado)} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Destinos más cotizados */}
        <div className="dashboard__panel">
          <div className="dashboard__panel-header">
            <h2 className="dashboard__panel-titulo">Destinos más cotizados</h2>
            <Link to="/admin/reportes" className="dashboard__panel-link">
              Ver reportes →
            </Link>
          </div>
          {cargando ? (
            <div className="dashboard__skeleton-lista">
              {[1, 2, 3, 4].map((i) => <div key={i} className="dashboard__skeleton-row" />)}
            </div>
          ) : destinosTop.length === 0 ? (
            <p className="dashboard__vacio">Sin cotizaciones registradas.</p>
          ) : (
            <div className="dashboard__destinos-lista">
              {destinosTop.map(({ nombre, total }) => (
                <div key={nombre} className="dashboard__destino-fila">
                  <span className="dashboard__destino-nombre">{nombre}</span>
                  <div className="dashboard__destino-barra-cont">
                    <div
                      className="dashboard__destino-barra-fill"
                      style={{ width: `${(total / maxTop) * 100}%` }}
                    />
                  </div>
                  <span className="dashboard__destino-total">{total}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Cotizaciones recientes ─── */}
      <div className="dashboard__panel dashboard__panel--ancho-completo">
        <div className="dashboard__panel-header">
          <h2 className="dashboard__panel-titulo">Cotizaciones recientes</h2>
          <Link to="/admin/cotizaciones" className="dashboard__panel-link">
            Ver cotizaciones →
          </Link>
        </div>
        {cargando ? (
          <div className="dashboard__skeleton-lista">
            {[1, 2, 3].map((i) => <div key={i} className="dashboard__skeleton-row" />)}
          </div>
        ) : cotizacionesRecientes.length === 0 ? (
          <p className="dashboard__vacio">Sin cotizaciones registradas.</p>
        ) : (
          <div className="dashboard__cot-tabla-cont">
            <table className="dashboard__cot-tabla">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Destino</th>
                  <th>Precio admin</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {cotizacionesRecientes.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <span className="dashboard__cot-cliente">{textoVisible(c.cliente_nombre, SIN_DATO.cliente)}</span>
                      {c.cliente_razon_social && <span className="dashboard__cot-razon">{c.cliente_razon_social}</span>}
                    </td>
                    <td>{textoVisible(c.destino_nombre, SIN_DATO.destino)}</td>
                    <td>
                      {c.precio_cotizado_eur !== null
                        ? <strong>€ {c.precio_cotizado_eur.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</strong>
                        : <span className="dashboard__cot-sin-precio">Sin cotizar</span>}
                    </td>
                    <td><EtiquetaEstado etiqueta={c.estado} variante={resolverVariante(c.estado)} /></td>
                    <td><span className="dashboard__cot-fecha">{formatFecha(c.creado_en)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
