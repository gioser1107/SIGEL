import { useMemo } from 'react';
import { TablaDatos, BotonAccionTabla, EtiquetaEstado } from '../../../../components/admin';
import type { Columna } from '../../../../components/admin';
import type { PasajeroManifiesto } from '../../../../types/abordaje';
import { nombreCompleto } from '../../../../utils/nombrePersona';
import { ETIQUETA_ESTADO_ABORDAJE } from '../constants';
import {
  formatearAsiento,
  formatearDocumento,
  formatearDomicilio,
} from '../utils/formatearAbordaje';

interface PropsTablaManifiestoAbordaje {
  pasajeros: PasajeroManifiesto[];
  cargando: boolean;
  procesando: boolean;
  seleccionados: Set<string | number>;
  puedeRegistrar: boolean;
  puedeEditar: boolean;
  puedeAnular: boolean;
  onSeleccionChange: (ids: Set<string | number>) => void;
  onMarcarAbordado: (pasajero: PasajeroManifiesto) => void;
  onMarcarNoPresentado: (pasajero: PasajeroManifiesto) => void;
  onEditar: (pasajero: PasajeroManifiesto) => void;
  onAnular: (pasajero: PasajeroManifiesto) => void;
}

export default function TablaManifiestoAbordaje({
  pasajeros,
  cargando,
  procesando,
  seleccionados,
  puedeRegistrar,
  puedeEditar,
  puedeAnular,
  onSeleccionChange,
  onMarcarAbordado,
  onMarcarNoPresentado,
  onEditar,
  onAnular,
}: PropsTablaManifiestoAbordaje) {
  const hayAcciones = puedeRegistrar || puedeEditar || puedeAnular;

  const columnas: Columna<PasajeroManifiesto>[] = useMemo(
    () => [
      {
        id: 'pasajero',
        encabezado: 'Pasajero',
        accessor: (p) => (
          <div className="abordaje-tabla__pasajero">
            <strong>{nombreCompleto(p.cliente.nombre, p.cliente.apellido)}</strong>
            {p.es_titular && <span className="abordaje-tabla__badge">Titular</span>}
            {p.es_menor && <span className="abordaje-tabla__badge abordaje-tabla__badge--menor">Menor</span>}
          </div>
        ),
      },
      {
        id: 'documento',
        encabezado: 'Documento',
        accessor: (p) => formatearDocumento(p.cliente.tipo_documento, p.cliente.numero_documento),
      },
      {
        id: 'domicilio',
        encabezado: 'Recogida',
        accessor: (p) => formatearDomicilio(p.domicilio),
      },
      {
        id: 'asiento',
        encabezado: 'Asiento',
        accessor: (p) => formatearAsiento(p.asiento?.numero, p.asiento?.posicion),
      },
      {
        id: 'estado',
        encabezado: 'Abordaje',
        accessor: (p) => (
          <EtiquetaEstado etiqueta={ETIQUETA_ESTADO_ABORDAJE[p.estado_abordaje]} />
        ),
      },
    ],
    [],
  );

  return (
    <TablaDatos
      columnas={columnas}
      datos={pasajeros}
      cargando={cargando}
      mensajeVacio="No hay pasajeros que coincidan con el filtro."
      idFila={(p) => p.reserva_cliente_id}
      seleccionMultiple={puedeRegistrar}
      filasSeleccionadas={seleccionados}
      onSeleccionChange={onSeleccionChange}
      accionesFila={
        hayAcciones
          ? (p) => {
              const reservaValida =
                p.reserva_estado === 'confirmada' || p.reserva_estado === 'abonada';
              const bloqueado = procesando || !reservaValida;
              return (
                <>
                  {puedeRegistrar && p.estado_abordaje === 'pendiente' && (
                    <>
                      <BotonAccionTabla
                        accion="aprobar"
                        titulo="Marcar abordado"
                        ariaLabel="Marcar abordado"
                        disabled={bloqueado}
                        onClick={(e) => { e.stopPropagation(); onMarcarAbordado(p); }}
                      />
                      <BotonAccionTabla
                        accion="rechazar"
                        titulo="No presentado"
                        ariaLabel="Marcar no presentado"
                        disabled={bloqueado}
                        onClick={(e) => { e.stopPropagation(); onMarcarNoPresentado(p); }}
                      />
                    </>
                  )}
                  {puedeEditar && p.abordaje && (
                    <BotonAccionTabla
                      accion="editar"
                      disabled={procesando}
                      onClick={(e) => { e.stopPropagation(); onEditar(p); }}
                    />
                  )}
                  {puedeAnular && p.abordaje && (
                    <BotonAccionTabla
                      accion="anular"
                      disabled={procesando}
                      onClick={(e) => { e.stopPropagation(); onAnular(p); }}
                    />
                  )}
                </>
              );
            }
          : undefined
      }
    />
  );
}
