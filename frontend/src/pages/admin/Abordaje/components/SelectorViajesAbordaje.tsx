import { TablaDatos, EtiquetaEstado } from '../../../../components/admin';
import type { Columna } from '../../../../components/admin';
import type { ViajeSelectorAbordaje } from '../../../../types/abordaje';
import { formatearFechaViaje } from '../utils/formatearAbordaje';

interface PropsSelectorViajesAbordaje {
  viajes: ViajeSelectorAbordaje[];
  cargando: boolean;
  onSeleccionar: (viajeId: number) => void;
}

const columnas: Columna<ViajeSelectorAbordaje>[] = [
  {
    id: 'destino',
    encabezado: 'Destino',
    accessor: (v) => v.destino_nombre ?? `Viaje #${v.id}`,
  },
  {
    id: 'fecha',
    encabezado: 'Salida',
    accessor: (v) => formatearFechaViaje(v.fecha_salida),
  },
  {
    id: 'guia',
    encabezado: 'Guía',
    accessor: (v) => v.guia_nombre ?? '—',
  },
  {
    id: 'estado',
    encabezado: 'Estado viaje',
    accessor: (v) =>
      v.estado ? (
        <EtiquetaEstado etiqueta={v.estado.charAt(0).toUpperCase() + v.estado.slice(1)} />
      ) : (
        '—'
      ),
  },
  {
    id: 'pasajeros',
    encabezado: 'Pasajeros',
    alineacion: 'center',
    accessor: (v) => v.resumen?.total_pasajeros ?? '—',
  },
  {
    id: 'pendientes',
    encabezado: 'Pendientes',
    alineacion: 'center',
    accessor: (v) => v.resumen?.pendientes ?? '—',
  },
];

export default function SelectorViajesAbordaje({
  viajes,
  cargando,
  onSeleccionar,
}: PropsSelectorViajesAbordaje) {
  return (
    <TablaDatos
      columnas={columnas}
      datos={viajes}
      cargando={cargando}
      mensajeVacio="No hay viajes disponibles para abordaje con los filtros seleccionados."
      idFila={(v) => v.id}
      onFilaClick={(v) => onSeleccionar(v.id)}
    />
  );
}
