import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CabeceraModulo,
  EtiquetaEstado,
  TablaDatos,
} from '../../../components/admin';
import type { Columna } from '../../../components/admin';
import Boton from '../../../components/ui/Boton/Boton';
import BtnImprimirReporte from '../../../components/ui/BtnImprimirReporte/BtnImprimirReporte';
import CabeceraReporteImpresion from '../../../components/ui/CabeceraReporteImpresion/CabeceraReporteImpresion';
import TablaReporteImpresion from '../../../components/ui/TablaReporteImpresion/TablaReporteImpresion';
import { ErrorApi } from '../../../services/api';
import { obtenerReporteViaje, obtenerViajes } from '../../../services/viajes';
import type { Viaje } from '../../../types/viaje';
import type { PasajeroReporteViaje, ReporteViaje as ReporteViajeData } from '../../../types/viajeReporte';
import { nombreCompleto } from '../../../utils/nombrePersona';
import { formatearEuro } from '../../../utils/formatoMoneda';
import { formatFecha } from '../Planificacion/utils/formatearViaje';
import { ETIQUETA_ESTADO } from '../Planificacion/constants';
import {
  formatearAsiento,
  formatearDocumento,
  formatearDomicilio,
} from '../Abordaje/utils/formatearAbordaje';
import '../Cotizaciones/Cotizaciones.css';
import './ReporteViaje.css';

const COLUMNAS_IMPRESION = [
  { encabezado: 'Pasajero', clave: 'pasajero' },
  { encabezado: 'Documento', clave: 'documento' },
  { encabezado: 'Reserva', clave: 'reserva' },
  { encabezado: 'Asiento', clave: 'asiento' },
  { encabezado: 'Recogida', clave: 'recogida' },
  { encabezado: 'Pago', clave: 'pago' },
] as const;

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
  const [viajeId, setViajeId] = useState<number | null>(null);
  const [reporte, setReporte] = useState<ReporteViajeData | null>(null);
  const [cargandoReporte, setCargandoReporte] = useState(false);
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

  const columnasViajes: Columna<Viaje>[] = useMemo(
    () => [
      {
        id: 'destino',
        encabezado: 'Destino',
        accessor: (v) => v.destino_nombre ?? `Viaje #${v.id}`,
      },
      {
        id: 'fecha',
        encabezado: 'Salida',
        accessor: (v) => formatFecha(v.fecha_salida),
      },
      {
        id: 'unidad',
        encabezado: 'Unidad',
        accessor: (v) => v.unidad_placa ?? '—',
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
            #{p.reserva_id}{' '}
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
                Total reserva: {formatearEuro(p.resumen_pagos.total_reserva_eur)} · Pagado:{' '}
                {formatearEuro(p.resumen_pagos.total_pagado_aprobado_eur)}
              </span>
            </div>
          );
        },
      },
    ],
    [],
  );

  const filasImpresion = useMemo(
    () =>
      (reporte?.pasajeros ?? []).map((p) => ({
        pasajero: nombreCompleto(p.cliente.nombre, p.cliente.apellido),
        documento: formatearDocumento(p.cliente.tipo_documento, p.cliente.numero_documento),
        reserva: `#${p.reserva_id} (${p.reserva_estado})`,
        asiento:
          p.ocupa_asiento === false
            ? 'Sin asiento'
            : formatearAsiento(p.asiento?.numero, p.asiento?.posicion),
        recogida: formatearDomicilio(p.domicilio),
        pago: etiquetaPago(p),
      })),
    [reporte],
  );

  function volverSelector() {
    setViajeId(null);
    setReporte(null);
    setError(null);
  }

  return (
    <div className="modulo-admin">
      <CabeceraModulo
        migaja="Administración / Reportes"
        titulo="Reporte operativo de viaje"
        descripcion="Consulta quiénes viajan, sus asientos y el estado de pago de cada reserva."
      />

      {error && (
        <div className="modulo-admin__error" role="alert">
          {error}
        </div>
      )}

      {viajeId == null ? (
        <TablaDatos
          columnas={columnasViajes}
          datos={viajes}
          cargando={cargandoViajes}
          mensajeVacio="No hay viajes registrados."
          idFila={(v) => v.id}
          onFilaClick={(v) => setViajeId(v.id)}
        />
      ) : (
        <>
          <div className="reporte-viaje__cabecera-detalle">
            <div>
              <h2 className="reporte-viaje__titulo-viaje">
                {reporte?.viaje.destino_nombre ?? `Viaje #${viajeId}`}
              </h2>
              <p className="reporte-viaje__meta-viaje">
                {reporte?.viaje.fecha_salida ? formatFecha(reporte.viaje.fecha_salida) : ''}
                {reporte?.viaje.unidad_placa ? ` · ${reporte.viaje.unidad_placa}` : ''}
                {reporte?.viaje.guia_nombre ? ` · Guía: ${reporte.viaje.guia_nombre}` : ''}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
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
            <div className="zona-imprimible solo-imprimir">
              <CabeceraReporteImpresion
                titulo="Reporte de pasajeros y pagos"
                subtitulo={`${reporte.viaje.destino_nombre ?? ''} · ${formatFecha(reporte.viaje.fecha_salida)}`}
                resumen={[
                  { etiqueta: 'Pasajeros', valor: reporte.resumen.total_pasajeros },
                  { etiqueta: 'Reservas', valor: reporte.resumen.total_reservas },
                  { etiqueta: 'Cobrado', valor: formatearEuro(reporte.resumen.total_cobrado_eur) },
                  { etiqueta: 'Saldo', valor: formatearEuro(reporte.resumen.saldo_pendiente_eur) },
                ]}
              />
              <TablaReporteImpresion columnas={COLUMNAS_IMPRESION} filas={filasImpresion} />
            </div>
          )}

          {reporte && (
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
          )}

          <TablaDatos
            columnas={columnasPasajeros}
            datos={reporte?.pasajeros ?? []}
            cargando={cargandoReporte}
            mensajeVacio="Este viaje no tiene pasajeros en reservas activas."
            idFila={(p) => p.reserva_cliente_id}
          />
        </>
      )}
    </div>
  );
}
