import { CuadriculaTarjetas, EtiquetaEstado, resolverVariante, BotonAccionTabla } from '../../../../components/admin';
import type { Cotizacion } from '../../../../types/cotizacion';
import { SIN_DATO, textoVisible } from '../../../../utils/etiquetasNegocio';
import { esBloqueada, formatFecha } from '../utils/formatearCotizacion';

interface PropsVistaTarjetas {
  datos: Cotizacion[];
  cargando: boolean;
  soloLectura?: boolean;
  onEditar: (cot: Cotizacion) => void;
  onRechazar: (cot: Cotizacion) => void;
  onImprimir: (cot: Cotizacion) => void;
  imprimiendo?: boolean;
}

// Renderiza la vista en tarjetas (kanban) del listado de cotizaciones
export default function VistaTarjetasCotizaciones({
  datos,
  cargando,
  soloLectura = false,
  onEditar,
  onRechazar,
  onImprimir,
  imprimiendo = false,
}: PropsVistaTarjetas) {
  return (
    <CuadriculaTarjetas
      datos={datos}
      cargando={cargando}
      columnas={3}
      mensajeVacio="No hay cotizaciones en este filtro."
      renderTarjeta={(cot) => (
        <div key={cot.id} className="cot-card">
          <div className="cot-card__header">
            <span className="cot-card__cliente">
              {textoVisible(cot.cliente_nombre, SIN_DATO.cliente)}
            </span>
            <EtiquetaEstado etiqueta={cot.estado} variante={resolverVariante(cot.estado)} />
          </div>
          {cot.cliente_razon_social && (
            <span className="cot-card__razon">{cot.cliente_razon_social}</span>
          )}
          <p className="cot-card__destino">{textoVisible(cot.destino_nombre, SIN_DATO.destino)}</p>
          <p className="cot-card__precio">
            {cot.precio_cotizado_eur !== null
              ? `€ ${cot.precio_cotizado_eur.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`
              : 'Sin cotizar'}
          </p>
          <p className="cot-card__fecha">{formatFecha(cot.creado_en)}</p>
          <div className="cot-card__acciones">
            <BotonAccionTabla
              accion="imprimir"
              onClick={() => onImprimir(cot)}
              disabled={imprimiendo}
              ariaLabel={`Imprimir cotización de ${textoVisible(cot.cliente_nombre, SIN_DATO.cliente)}`}
            />
            {!soloLectura && (
              <>
                <BotonAccionTabla
                  accion="editar"
                  onClick={() => onEditar(cot)}
                  disabled={esBloqueada(cot.estado)}
                />
                <BotonAccionTabla
                  accion="rechazar"
                  onClick={() => onRechazar(cot)}
                  disabled={esBloqueada(cot.estado)}
                />
              </>
            )}
          </div>
        </div>
      )}
    />
  );
}
