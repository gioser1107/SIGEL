import { EtiquetaEstado, resolverVariante } from '../../../../components/admin';
import type { Columna } from '../../../../components/admin';
import type { Viaje } from '../../../../types/viaje';
import { SIN_DATO, textoVisible } from '../../../../utils/etiquetasNegocio';
import { formatFecha } from '../utils/formatearViaje';
import { etiquetaGuiasViaje } from '../utils/planificacionGuias';

// Construye la definición de columnas de la tabla de viajes
export function columnasViajes(): Columna<Viaje>[] {
  return [
    {
      id: 'destino',
      encabezado: 'Destino',
      ordenable: true,
      accessor: (v) => (
        <div className="plan-tabla__destino">
          <span className="plan-tabla__destino-nombre">
            {textoVisible(v.destino_nombre, SIN_DATO.destino)}
          </span>
          <span className="plan-tabla__guia">
            Guía: {etiquetaGuiasViaje(v)}
          </span>
        </div>
      ),
    },
    {
      id: 'fecha_salida',
      encabezado: 'Fecha salida',
      ordenable: true,
      accessor: (v) => <span className="plan-tabla__fecha">{formatFecha(v.fecha_salida)}</span>,
    },
    {
      id: 'unidad',
      encabezado: 'Unidad',
      accessor: (v) => (
        <span className="plan-tabla__placa">{textoVisible(v.unidad_placa, SIN_DATO.unidad)}</span>
      ),
    },
    {
      id: 'estado',
      encabezado: 'Estado',
      alineacion: 'center',
      accessor: (v) => (
        <EtiquetaEstado etiqueta={v.estado} variante={resolverVariante(v.estado)} />
      ),
    },
  ];
}
