import { EtiquetaEstado, resolverVariante } from '../../../../components/admin';
import type { Columna } from '../../../../components/admin';
import type { Cotizacion } from '../../../../types/cotizacion';
import { formatFecha } from '../utils/formatearCotizacion';

// Construye la definición de columnas de la tabla de cotizaciones
export function columnasCotizaciones(): Columna<Cotizacion>[] {
  return [
    {
      id: 'cliente',
      encabezado: 'Cliente / Empresa',
      accessor: (c) => (
        <div className="cot-tabla__cliente">
          <span className="cot-tabla__cliente-nombre">
            {c.cliente_nombre ?? `Cliente #${c.cliente_id}`}
          </span>
          {c.cliente_razon_social && (
            <span className="cot-tabla__razon">{c.cliente_razon_social}</span>
          )}
        </div>
      ),
    },
    {
      id: 'destino',
      encabezado: 'Destino',
      accessor: (c) => c.destino_nombre ?? `Destino #${c.destino_id}`,
    },
    {
      id: 'fecha',
      encabezado: 'Fecha solicitud',
      ordenable: true,
      accessor: (c) => <span className="cot-tabla__fecha">{formatFecha(c.creado_en)}</span>,
    },
    {
      id: 'precio',
      encabezado: 'Precio',
      alineacion: 'right',
      accessor: (c) => (
        <span className={c.precio_cotizado_eur !== null ? 'cot-tabla__precio' : 'cot-tabla__sin-precio'}>
          {c.precio_cotizado_eur !== null
            ? `€ ${c.precio_cotizado_eur.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`
            : 'Sin cotizar'}
        </span>
      ),
    },
    {
      id: 'estado',
      encabezado: 'Estado',
      alineacion: 'center',
      accessor: (c) => (
        <EtiquetaEstado etiqueta={c.estado} variante={resolverVariante(c.estado)} />
      ),
    },
  ];
}
