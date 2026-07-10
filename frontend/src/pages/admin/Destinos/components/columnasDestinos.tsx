import { EtiquetaEstado } from '../../../../components/admin';
import type { Columna } from '../../../../components/admin';
import type { Destino } from '../../../../types/destino';
import { ETIQUETA_ESTADO } from '../constants';
import { formatFecha, formatPrecio, varianteEstadoDestino } from '../utils/formatearDestino';

export function columnasDestinos(esAnulados = false): Columna<Destino>[] {
  return [
    {
      id: 'nombre',
      encabezado: 'Destino',
      ordenable: true,
      accessor: (d) => (
        <div className="dest-tabla__nombre">
          <span className="dest-tabla__nombre-texto">{d.nombre}</span>
          {d.descripcion && (
            <span className="dest-tabla__descripcion">{d.descripcion}</span>
          )}
        </div>
      ),
    },
    {
      id: 'precio_base_eur',
      encabezado: 'Precio base',
      alineacion: 'right',
      accessor: (d) => (
        <span className="dest-tabla__precio">{formatPrecio(d.precio_base_eur)}</span>
      ),
    },
    {
      id: 'activo',
      encabezado: esAnulados ? 'Anulado' : 'Estado',
      alineacion: 'center',
      accessor: (d) =>
        d.eliminado_en || esAnulados ? (
          <EtiquetaEstado
            etiqueta={formatFecha(d.eliminado_en)}
            variante="error"
          />
        ) : (
          <EtiquetaEstado
            etiqueta={d.activo ? ETIQUETA_ESTADO.activo : ETIQUETA_ESTADO.inactivo}
            variante={varianteEstadoDestino(d.activo)}
          />
        ),
    },
  ];
}
