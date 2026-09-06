import LogoMarca from '../../../components/ui/LogoMarca/LogoMarca';
import type { ReporteViaje as ReporteViajeData } from '../../../types/viajeReporte';
import { codigoReserva, etiquetaEstado, SIN_DATO, textoVisible } from '../../../utils/etiquetasNegocio';
import { nombreCompleto } from '../../../utils/nombrePersona';
import { formatearEuro } from '../../../utils/formatoMoneda';
import { formatFecha } from '../Planificacion/utils/formatearViaje';
import { formatearAsiento, formatearDocumento, formatearDomicilio } from '../Abordaje/utils/formatearAbordaje';

interface DocumentoImpresionViajeProps {
  reporte: ReporteViajeData;
}

function fechaGeneracion(): string {
  return new Date().toLocaleString('es-VE', {
    dateStyle: 'long',
    timeStyle: 'short',
  });
}

function etiquetaPago(pagado: boolean, saldo: number, validacion: number): string {
  if (pagado) return 'Pagado';
  if (saldo > 0.01) return `Saldo ${formatearEuro(saldo)}`;
  if (validacion > 0) return `En validación ${formatearEuro(validacion)}`;
  return 'Sin pagos';
}

export default function DocumentoImpresionViaje({ reporte }: DocumentoImpresionViajeProps) {
  const { viaje, ocupacion, resumen, reservas, pasajeros } = reporte;
  const destino = textoVisible(viaje.destino_nombre, SIN_DATO.viaje);

  return (
    <div className="zona-imprimible doc-viaje">
      <header className="doc-viaje__cabecera">
        <LogoMarca compacto />
        <div className="doc-viaje__tipo">
          <span className="doc-viaje__tipo-etiqueta">Reporte operativo</span>
          <span className="doc-viaje__numero">{destino}</span>
        </div>
      </header>

      <p className="doc-viaje__generado">Generado: {fechaGeneracion()}</p>

      <div className="doc-viaje__meta">
        <div>
          <span>Salida</span>
          <strong>{formatFecha(viaje.fecha_salida)}</strong>
        </div>
        <div>
          <span>Unidad</span>
          <strong>{textoVisible(viaje.unidad_placa, SIN_DATO.unidad)}</strong>
        </div>
        <div>
          <span>Guía</span>
          <strong>{textoVisible(viaje.guia_nombre, SIN_DATO.guia)}</strong>
        </div>
        <div>
          <span>Estado</span>
          <strong>{etiquetaEstado(viaje.estado)}</strong>
        </div>
      </div>

      <div className="doc-viaje__kpis">
        <div>
          <span>Pasajeros</span>
          <strong>{resumen.total_pasajeros}</strong>
        </div>
        <div>
          <span>Reservas</span>
          <strong>{resumen.total_reservas}</strong>
        </div>
        <div>
          <span>Ocupación</span>
          <strong>{ocupacion.total_ocupados}/{ocupacion.total_asientos}</strong>
        </div>
        <div>
          <span>Cobrado</span>
          <strong>{formatearEuro(resumen.total_cobrado_eur)}</strong>
        </div>
        <div>
          <span>Saldo</span>
          <strong>{formatearEuro(resumen.saldo_pendiente_eur)}</strong>
        </div>
        <div>
          <span>Reservas pagadas</span>
          <strong>{resumen.reservas_pagadas_completas}/{resumen.total_reservas}</strong>
        </div>
      </div>

      <section className="doc-viaje__bloque">
        <h2>Pasajeros</h2>
        {pasajeros.length === 0 ? (
          <p className="doc-viaje__vacio">Este viaje no tiene pasajeros en reservas activas.</p>
        ) : (
          <table className="doc-viaje__tabla">
            <thead>
              <tr>
                <th>Pasajero</th>
                <th>Documento</th>
                <th>Teléfono</th>
                <th>Reserva</th>
                <th>Asiento</th>
                <th>Recogida</th>
                <th>Pago</th>
              </tr>
            </thead>
            <tbody>
              {pasajeros.map((p) => (
                <tr key={p.reserva_cliente_id}>
                  <td>
                    {nombreCompleto(p.cliente.nombre, p.cliente.apellido)}
                    {p.es_titular ? ' · Titular' : ''}
                    {p.es_menor ? ' · Menor' : ''}
                  </td>
                  <td>{formatearDocumento(p.cliente.tipo_documento, p.cliente.numero_documento)}</td>
                  <td>{p.cliente.telefono ?? '—'}</td>
                  <td>{`${codigoReserva(p.reserva_id)} (${etiquetaEstado(p.reserva_estado)})`}</td>
                  <td>
                    {p.ocupa_asiento === false
                      ? 'Sin asiento'
                      : formatearAsiento(p.asiento?.numero, p.asiento?.posicion)}
                  </td>
                  <td>{formatearDomicilio(p.domicilio)}</td>
                  <td>
                    {etiquetaPago(
                      p.resumen_pagos.pagado_completo,
                      p.resumen_pagos.saldo_pendiente_eur,
                      p.resumen_pagos.total_pendiente_validacion_eur,
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {reservas.length > 0 && (
        <section className="doc-viaje__bloque">
          <h2>Reservas y cobros</h2>
          <table className="doc-viaje__tabla">
            <thead>
              <tr>
                <th>Reserva</th>
                <th>Titular</th>
                <th>Pasajeros</th>
                <th>Estado</th>
                <th className="doc-viaje__col-monto">Total</th>
                <th className="doc-viaje__col-monto">Cobrado</th>
                <th className="doc-viaje__col-monto">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {reservas.map((r) => (
                <tr key={r.id}>
                  <td>{codigoReserva(r.id)}</td>
                  <td>{r.titular ? nombreCompleto(r.titular.nombre, r.titular.apellido) : '—'}</td>
                  <td>{r.cantidad_pasajeros}</td>
                  <td>{etiquetaEstado(r.estado)}</td>
                  <td className="doc-viaje__col-monto">{formatearEuro(r.resumen_pagos.total_reserva_eur)}</td>
                  <td className="doc-viaje__col-monto">{formatearEuro(r.resumen_pagos.total_pagado_aprobado_eur)}</td>
                  <td className="doc-viaje__col-monto">{formatearEuro(r.resumen_pagos.saldo_pendiente_eur)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <footer className="doc-viaje__pie">
        <div>
          <strong>Travel BQTO</strong>
          <p>Documento de uso interno. No sustituye un manifiesto oficial de abordaje.</p>
        </div>
        <p>Total reservado: {formatearEuro(resumen.total_reservado_eur)}</p>
      </footer>
    </div>
  );
}
