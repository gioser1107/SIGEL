import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CabeceraModulo,
  EtiquetaEstado,
  TablaDatos,
} from '../../../components/admin';
import type { Columna } from '../../../components/admin';
import Boton from '../../../components/ui/Boton/Boton';
import BtnImprimirReporte from '../../../components/ui/BtnImprimirReporte/BtnImprimirReporte';
import { ErrorApi } from '../../../services/api';
import { obtenerReporteViaje, obtenerViajes } from '../../../services/viajes';
import type { Viaje } from '../../../types/viaje';
import type { PasajeroReporteViaje, ReporteViaje as ReporteViajeData } from '../../../types/viajeReporte';
import { codigoReserva, etiquetaEstado, SIN_DATO, textoVisible } from '../../../utils/etiquetasNegocio';
import { nombreCompleto } from '../../../utils/nombrePersona';
import { formatearEuro } from '../../../utils/formatoMoneda';
import { formatFecha } from '../Planificacion/utils/formatearViaje';
import { ETIQUETA_ESTADO } from '../Planificacion/constants';
import {
  formatearAsiento,
  formatearDocumento,
  formatearDomicilio,
} from '../Abordaje/utils/formatearAbordaje';
import DocumentoImpresionViaje from './DocumentoImpresionViaje';
import '../Cotizaciones/Cotizaciones.css';
import './ReporteViaje.css';

function etiquetaPago(p: PasajeroReporteViaje): string {
  const r = p.resumen_pagos;
  if (r.pagado_completo) return 'Pagado completo';
  if (r.saldo_pendiente_eur > 0.01) {
    return `Saldo ${formatearEuro(r.saldo_pendiente_eur)}`;
  }
  if (r.total_pendiente_validacion_eur > 0) {
    return `En validación ${formatearEuro(r.total_pendiente_validacion_eur)}`;
  }
  return 'Sin pagos';
}

export default function ReporteViaje() {
  const [viajes, setViajes] = useState<Viaje[]>([]);
  const [cargandoViajes, setCargandoViajes] = useState(true);
  const [busquedaViaje, setBusquedaViaje] = useState('');
  const [viajeId, setViajeId] = useState<number | null>(null);
  const [reporte, setReporte] = useState<ReporteViajeData | null>(null);
  const [cargandoReporte, setCargandoReporte] = useState(false);
  const [busquedaPasajero, setBusquedaPasajero] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCargandoViajes(true);
    obtenerViajes({ filtro: 'todos', pagina: 1, limite: 100 })
      .then((res) => setViajes(res.items))
      .catch(() => setViajes([]))
      .finally(() => setCargandoViajes(false));
  }, []);

  const cargarReporte = useCallback(async (id: number) => {
    setCargandoReporte(true);
    setError(null);
    try {
      const data = await obtenerReporteViaje(id);
      setReporte(data);
    } catch (err) {
      setReporte(null);
      setError(
        err instanceof ErrorApi || err instanceof Error
          ? err.message
          : 'No se pudo cargar el reporte del viaje.',
      );
    } finally {
      setCargandoReporte(false);
    }
  }, []);

  useEffect(() => {
    if (viajeId == null) return;
    void cargarReporte(viajeId);
  }, [viajeId, cargarReporte]);

  const viajesFiltrados = useMemo(() => {
    const q = busquedaViaje.trim().toLowerCase();
    if (!q) return viajes;
    return viajes.filter((v) => {
      const destino = (v.destino_nombre ?? '').toLowerCase();
      const placa = (v.unidad_placa ?? '').toLowerCase();
      const guia = (v.guia_nombre ?? '').toLowerCase();
      const fecha = formatFecha(v.fecha_salida).toLowerCase();
      return destino.includes(q) || placa.includes(q) || guia.includes(q) || fecha.includes(q);
    });
  }, [viajes, busquedaViaje]);

  const pasajerosFiltrados = useMemo(() => {
    const lista = reporte?.pasajeros ?? [];
    const q = busquedaPasajero.trim().toLowerCase();
    if (!q) return lista;
    return lista.filter((p) => {
      const nombre = nombreCompleto(p.cliente.nombre, p.cliente.apellido).toLowerCase();
      const doc = `${p.cliente.tipo_documento}${p.cliente.numero_documento}`.toLowerCase();
      const tel = (p.cliente.telefono ?? '').toLowerCase();
      const reserva = codigoReserva(p.reserva_id).toLowerCase();
      return nombre.includes(q) || doc.includes(q) || tel.includes(q) || reserva.includes(q);
    });
  }, [reporte, busquedaPasajero]);

  const columnasViajes: Columna<Viaje>[] = useMemo(
    () => [
      {
        id: 'destino',
        encabezado: 'Destino',
        accessor: (v) => (
          <div className="reporte-viaje__celda-viaje">
            <strong>{textoVisible(v.destino_nombre, SIN_DATO.viaje)}</strong>
            <span>{formatFecha(v.fecha_salida)}</span>
          </div>
        ),
      },
      {
        id: 'unidad',
        encabezado: 'Unidad',
        accessor: (v) => v.unidad_placa ?? '—',
      },
      {
        id: 'guia',
        encabezado: 'Guía',
        accessor: (v) => v.guia_nombre ?? '—',
      },
      {
        id: 'estado',
        encabezado: 'Estado',
        accessor: (v) => (
          <EtiquetaEstado etiqueta={ETIQUETA_ESTADO[v.estado ?? ''] ?? v.estado ?? '—'} />
        ),
      },
    ],
    [],
  );

  const columnasPasajeros: Columna<PasajeroReporteViaje>[] = useMemo(
    () => [
      {
        id: 'pasajero',
        encabezado: 'Pasajero',
        accessor: (p) => (
          <div>
            <strong>{nombreCompleto(p.cliente.nombre, p.cliente.apellido)}</strong>
            {p.es_titular && <span className="reporte-viaje__badge">Titular</span>}
            {p.es_menor && <span className="reporte-viaje__badge reporte-viaje__badge--menor">Menor</span>}
          </div>
        ),
      },
      {
        id: 'documento',
        encabezado: 'Documento',
        accessor: (p) => formatearDocumento(p.cliente.tipo_documento, p.cliente.numero_documento),
      },
      {
        id: 'telefono',
        encabezado: 'Teléfono',
        accessor: (p) => p.cliente.telefono ?? '—',
      },
      {
        id: 'reserva',
        encabezado: 'Reserva',
        accessor: (p) => (
          <span>
            {codigoReserva(p.reserva_id)}{' '}
            <EtiquetaEstado etiqueta={p.reserva_estado} />
          </span>
        ),
      },
      {
        id: 'asiento',
        encabezado: 'Asiento',
        accessor: (p) =>
          p.ocupa_asiento === false
            ? 'Sin asiento'
            : formatearAsiento(p.asiento?.numero, p.asiento?.posicion),
      },
      {
        id: 'recogida',
        encabezado: 'Recogida',
        accessor: (p) => formatearDomicilio(p.domicilio),
      },
      {
        id: 'pago',
        encabezado: 'Estado de pago',
        accessor: (p) => {
          const texto = etiquetaPago(p);
          const clase = p.resumen_pagos.pagado_completo
            ? 'reporte-viaje__pago--completo'
            : 'reporte-viaje__pago--pendiente';
          return (
            <div className={`reporte-viaje__pago ${clase}`}>
              <span>{texto}</span>
              <span>
                Total {formatearEuro(p.resumen_pagos.total_reserva_eur)} · Pagado{' '}
                {formatearEuro(p.resumen_pagos.total_pagado_aprobado_eur)}
              </span>
            </div>
          );
        },
      },
    ],
    [],
  );

  function volverSelector() {
    setViajeId(null);
    setReporte(null);
    setError(null);
    setBusquedaPasajero('');
  }

  const ocupacionPct = reporte && reporte.ocupacion.total_asientos > 0
    ? Math.round((reporte.ocupacion.total_ocupados / reporte.ocupacion.total_asientos) * 100)
    : 0;

  return (
    <div className="reporte-viaje">
      <div className="no-imprimir">
        <CabeceraModulo
          migaja="Administración / Reportes"
          titulo="Reporte operativo de viaje"
          descripcion="Manifiesto de pasajeros, asientos y cobros de una salida. Imprime un documento, no la pantalla."
        />

        {error && (
          <div className="modulo-admin__error" role="alert">
            {error}
          </div>
        )}

        {viajeId == null ? (
          <>
            <div className="cotizaciones__toolbar">
              <div className="cotizaciones__toolbar-izq">
                <div className="cotizaciones__busqueda">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Buscar por destino, fecha, unidad o guía…"
                    value={busquedaViaje}
                    onChange={(e) => setBusquedaViaje(e.target.value)}
                    aria-label="Buscar viajes"
                  />
                </div>
              </div>
            </div>
            <TablaDatos
              columnas={columnasViajes}
              datos={viajesFiltrados}
              cargando={cargandoViajes}
              mensajeVacio="No hay viajes que coincidan con la búsqueda."
              idFila={(v) => v.id}
              onFilaClick={(v) => setViajeId(v.id)}
            />
          </>
        ) : (
          <>
            <div className="reporte-viaje__cabecera-detalle">
              <div>
                <div className="reporte-viaje__titulo-fila">
                  <h2 className="reporte-viaje__titulo-viaje">
                    {textoVisible(reporte?.viaje.destino_nombre, SIN_DATO.viaje)}
                  </h2>
                  {reporte?.viaje.estado && (
                    <EtiquetaEstado etiqueta={etiquetaEstado(reporte.viaje.estado)} />
                  )}
                </div>
                <p className="reporte-viaje__meta-viaje">
                  {reporte?.viaje.fecha_salida ? formatFecha(reporte.viaje.fecha_salida) : ''}
                  {reporte?.viaje.unidad_placa ? ` · ${reporte.viaje.unidad_placa}` : ''}
                  {reporte?.viaje.guia_nombre ? ` · Guía: ${reporte.viaje.guia_nombre}` : ''}
                </p>
              </div>
              <div className="reporte-viaje__acciones">
                <Boton type="button" variante="secundario" tamano="sm" onClick={volverSelector}>
                  Cambiar viaje
                </Boton>
                {reporte && (
                  <BtnImprimirReporte
                    etiqueta="Imprimir reporte"
                    deshabilitado={cargandoReporte || reporte.pasajeros.length === 0}
                  />
                )}
              </div>
            </div>

            {reporte && (
              <>
                <div className="reporte-viaje__resumen">
                  <div className="reporte-viaje__tarjeta">
                    <span className="reporte-viaje__tarjeta-valor">{reporte.resumen.total_pasajeros}</span>
                    <span className="reporte-viaje__tarjeta-etiqueta">Pasajeros</span>
                  </div>
                  <div className="reporte-viaje__tarjeta">
                    <span className="reporte-viaje__tarjeta-valor">{reporte.resumen.total_reservas}</span>
                    <span className="reporte-viaje__tarjeta-etiqueta">Reservas</span>
                  </div>
                  <div className="reporte-viaje__tarjeta">
                    <span className="reporte-viaje__tarjeta-valor">
                      {reporte.ocupacion.total_ocupados}/{reporte.ocupacion.total_asientos}
                    </span>
                    <span className="reporte-viaje__tarjeta-etiqueta">Asientos ocupados</span>
                    <div className="reporte-viaje__barra" aria-hidden="true">
                      <span className="reporte-viaje__barra-valor" style={{ width: `${ocupacionPct}%` }} />
                    </div>
                  </div>
                  <div className="reporte-viaje__tarjeta reporte-viaje__tarjeta--ok">
                    <span className="reporte-viaje__tarjeta-valor">
                      {formatearEuro(reporte.resumen.total_cobrado_eur)}
                    </span>
                    <span className="reporte-viaje__tarjeta-etiqueta">Cobrado (aprobado)</span>
                  </div>
                  <div className="reporte-viaje__tarjeta reporte-viaje__tarjeta--aviso">
                    <span className="reporte-viaje__tarjeta-valor">
                      {formatearEuro(reporte.resumen.saldo_pendiente_eur)}
                    </span>
                    <span className="reporte-viaje__tarjeta-etiqueta">Saldo pendiente</span>
                  </div>
                  <div className="reporte-viaje__tarjeta">
                    <span className="reporte-viaje__tarjeta-valor">
                      {reporte.resumen.reservas_pagadas_completas}/{reporte.resumen.total_reservas}
                    </span>
                    <span className="reporte-viaje__tarjeta-etiqueta">Reservas pagadas</span>
                  </div>
                </div>

                <div className="cotizaciones__toolbar">
                  <div className="cotizaciones__toolbar-izq">
                    <div className="cotizaciones__busqueda">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                      <input
                        type="text"
                        placeholder="Buscar pasajero, documento o reserva…"
                        value={busquedaPasajero}
                        onChange={(e) => setBusquedaPasajero(e.target.value)}
                        aria-label="Buscar pasajeros"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            <TablaDatos
              columnas={columnasPasajeros}
              datos={pasajerosFiltrados}
              cargando={cargandoReporte}
              mensajeVacio="Este viaje no tiene pasajeros en reservas activas."
              idFila={(p) => p.reserva_cliente_id}
            />
          </>
        )}
      </div>

      {reporte && <DocumentoImpresionViaje reporte={reporte} />}
    </div>
  );
}
