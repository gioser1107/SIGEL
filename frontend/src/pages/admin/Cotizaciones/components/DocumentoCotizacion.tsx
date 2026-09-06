import LogoMarca from '../../../../components/ui/LogoMarca/LogoMarca';
import type { Cotizacion, CotizacionLinea } from '../../../../types/cotizacion';
import { CATEGORIAS_LINEA } from '../constants';
import { formatFecha, formatearMonedaEur } from '../utils/formatearCotizacion';
import './DocumentoCotizacion.css';

interface DocumentoCotizacionProps {
  cotizacion: Cotizacion;
  lineas: CotizacionLinea[];
}

const ETIQUETA_CATEGORIA = Object.fromEntries(
  CATEGORIAS_LINEA.map((c) => [c.id, c.etiqueta]),
);

function etiquetaCategoria(categoria: string): string {
  return ETIQUETA_CATEGORIA[categoria] ?? categoria;
}

function numeroCotizacion(id: number): string {
  return `COT-${String(id).padStart(5, '0')}`;
}

export default function DocumentoCotizacion({ cotizacion, lineas }: DocumentoCotizacionProps) {
  const total =
    lineas.length > 0
      ? lineas.reduce((suma, l) => suma + l.monto_eur, 0)
      : (cotizacion.precio_cotizado_eur ?? 0);

  return (
    <div className="zona-imprimible-cotizacion">
      <article className="doc-cotizacion">
        <header className="doc-cotizacion__cabecera">
          <LogoMarca />
          <div className="doc-cotizacion__tipo">
            <span className="doc-cotizacion__tipo-etiqueta">Cotización comercial</span>
            <strong className="doc-cotizacion__numero">{numeroCotizacion(cotizacion.id)}</strong>
          </div>
        </header>

        <div className="doc-cotizacion__meta">
          <div>
            <span>Fecha de emisión</span>
            <strong>{formatFecha(cotizacion.creado_en)}</strong>
          </div>
          <div>
            <span>Válida hasta</span>
            <strong>
              {cotizacion.valida_hasta ? formatFecha(cotizacion.valida_hasta) : 'Por definir'}
            </strong>
          </div>
          <div>
            <span>Moneda</span>
            <strong>Euro (EUR)</strong>
          </div>
        </div>

        <section className="doc-cotizacion__partes">
          <div>
            <h2>Cliente</h2>
            <p className="doc-cotizacion__nombre">
              {cotizacion.cliente_razon_social ??
                cotizacion.cliente_nombre ??
                'Cliente sin nombre'}
            </p>
            {cotizacion.cliente_razon_social && cotizacion.cliente_nombre && (
              <p>Contacto: {cotizacion.cliente_nombre}</p>
            )}
          </div>
          <div>
            <h2>Servicio cotizado</h2>
            <p className="doc-cotizacion__nombre">
              {cotizacion.destino_nombre ?? 'Destino no asignado'}
            </p>
            <p>Excursión / viaje grupal TravelBqto</p>
          </div>
        </section>

        {cotizacion.requisitos && (
          <section className="doc-cotizacion__bloque">
            <h2>Requisitos y alcance</h2>
            <p className="doc-cotizacion__texto">{cotizacion.requisitos}</p>
          </section>
        )}

        <section className="doc-cotizacion__bloque">
          <h2>Desglose de la propuesta</h2>
          <table className="doc-cotizacion__tabla">
            <thead>
              <tr>
                <th>Concepto</th>
                <th>Descripción</th>
                <th className="doc-cotizacion__col-monto">Monto</th>
              </tr>
            </thead>
            <tbody>
              {lineas.length === 0 ? (
                <tr>
                  <td>Paquete turístico</td>
                  <td>{cotizacion.destino_nombre ?? 'Servicio cotizado'}</td>
                  <td className="doc-cotizacion__col-monto">
                    {cotizacion.precio_cotizado_eur !== null
                      ? formatearMonedaEur(cotizacion.precio_cotizado_eur)
                      : 'Por cotizar'}
                  </td>
                </tr>
              ) : (
                lineas.map((linea) => (
                  <tr key={linea.id}>
                    <td>{etiquetaCategoria(linea.categoria)}</td>
                    <td>{linea.descripcion?.trim() || '—'}</td>
                    <td className="doc-cotizacion__col-monto">
                      {formatearMonedaEur(linea.monto_eur)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="doc-cotizacion__total">
            <span>Total de la cotización</span>
            <strong>
              {cotizacion.precio_cotizado_eur !== null || lineas.length > 0
                ? formatearMonedaEur(total)
                : 'Por cotizar'}
            </strong>
          </div>
        </section>

        <section className="doc-cotizacion__condiciones">
          <h2>Condiciones</h2>
          <ul>
            <li>
              Esta propuesta es válida hasta la fecha indicada. Vencida esa fecha, los montos
              pueden ajustarse.
            </li>
            <li>Los precios están expresados en euros (EUR) y no constituyen una reserva.</li>
            <li>
              Para confirmar el servicio, el cliente debe aceptar la cotización y formalizar la
              reserva con TravelBqto.
            </li>
          </ul>
        </section>

        <footer className="doc-cotizacion__pie">
          <div>
            <strong>TravelBqto</strong>
            <p>Parroquia Ana Soto · Barquisimeto, estado Lara</p>
            <p>info@travelbqto.com</p>
          </div>
          <p className="doc-cotizacion__firma">Documento generado para entrega al cliente.</p>
        </footer>
      </article>
    </div>
  );
}
