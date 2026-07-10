import { CuadriculaTarjetas, EtiquetaEstado, resolverVariante, BotonAccionTabla } from '../../../../components/admin';
import type { Viaje } from '../../../../types/viaje';
import { formatFecha } from '../utils/formatearViaje';

interface PropsVistaTarjetas {
  datos: Viaje[];
  cargando: boolean;
  soloLectura?: boolean;
  onEditar: (viaje: Viaje) => void;
  onAnular: (viaje: Viaje) => void;
}

// Renderiza la vista en tarjetas del listado de viajes planificados
export default function VistaTarjetasPlanificacion({
  datos,
  cargando,
  soloLectura = false,
  onEditar,
  onAnular,
}: PropsVistaTarjetas) {
  return (
    <CuadriculaTarjetas
      datos={datos}
      cargando={cargando}
      columnas={3}
      mensajeVacio="No hay viajes registrados."
      renderTarjeta={(viaje) => (
        <div key={viaje.id} className="plan-card">
          <div className="plan-card__header">
            <span className="plan-card__destino">
              {viaje.destino_nombre ?? `Destino #${viaje.destino_id}`}
            </span>
            <EtiquetaEstado etiqueta={viaje.estado} variante={resolverVariante(viaje.estado)} />
          </div>
          <p className="plan-card__fecha">{formatFecha(viaje.fecha_salida)}</p>
          <p className="plan-card__unidad">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="1" y="3" width="15" height="13" rx="2" />
              <path d="M16 8h4l3 3v5a2 2 0 0 1-2 2h-1" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
            {viaje.unidad_placa ?? `Unidad #${viaje.unidad_id}`}
          </p>
          <div className="plan-card__acciones">
            {!soloLectura && (
              <>
                <BotonAccionTabla accion="editar" onClick={() => onEditar(viaje)} />
                <BotonAccionTabla accion="anular" onClick={() => onAnular(viaje)} />
              </>
            )}
          </div>
        </div>
      )}
    />
  );
}
