import { CuadriculaTarjetas, EtiquetaEstado, BotonAccionTabla } from '../../../../components/admin';
import type { Destino } from '../../../../types/destino';
import { ETIQUETA_ESTADO } from '../constants';
import { formatFecha, formatPrecio, varianteEstadoDestino } from '../utils/formatearDestino';

interface PropsVistaTarjetas {
  datos: Destino[];
  cargando: boolean;
  soloLectura?: boolean;
  onEditar: (destino: Destino) => void;
  onAnular?: (destino: Destino) => void;
}

export default function VistaTarjetasDestinos({
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
      mensajeVacio="No hay destinos en este filtro."
      renderTarjeta={(destino) => (
        <div key={destino.id} className="dest-card">
          {destino.imagen && (
            <div
              className="dest-card__imagen"
              style={{ backgroundImage: `url(${destino.imagen})` }}
              role="img"
              aria-label={`Imagen de ${destino.nombre}`}
            />
          )}
          <div className="dest-card__header">
            <span className="dest-card__nombre">{destino.nombre}</span>
            {destino.eliminado_en ? (
              <EtiquetaEstado
                etiqueta={`${ETIQUETA_ESTADO.anulado} ${formatFecha(destino.eliminado_en)}`}
                variante="error"
              />
            ) : (
              <EtiquetaEstado
                etiqueta={destino.activo ? ETIQUETA_ESTADO.activo : ETIQUETA_ESTADO.inactivo}
                variante={varianteEstadoDestino(destino.activo)}
              />
            )}
          </div>
          {destino.descripcion && (
            <p className="dest-card__descripcion">{destino.descripcion}</p>
          )}
          <p className="dest-card__precio">{formatPrecio(destino.precio_base_eur)}</p>
          <p className="dest-card__dificultad">{destino.dificultad ?? 'Moderado'}</p>
          {!soloLectura && (
            <div className="dest-card__acciones">
              <BotonAccionTabla accion="editar" onClick={() => onEditar(destino)} />
              {onAnular && (
                <BotonAccionTabla accion="anular" onClick={() => onAnular(destino)} />
              )}
            </div>
          )}
        </div>
      )}
    />
  );
}
