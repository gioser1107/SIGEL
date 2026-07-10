import Boton from '../../../../../components/ui/Boton/Boton';
import type { Cotizacion, DatosCotizacionNueva, EstadoCotizacion } from '../../../../../types/cotizacion';
import { ETIQUETA_ESTADO, ESTADOS_COTIZACION } from '../../constants';
import { esBloqueada, etiquetaCliente } from '../../utils/formatearCotizacion';

interface PropsTabInfo {
  cotizacion: Cotizacion;
  form: DatosCotizacionNueva;
  lineasCount: number;
  onFormChange: (form: DatosCotizacionNueva) => void;
  onCambiarEstado: (cot: Cotizacion, estado: EstadoCotizacion) => void;
  onRechazar: (cot: Cotizacion) => void;
}

// Pestaña Info del drawer de edición: ficha, formulario y acciones de estado
export default function TabInfoCotizacion({
  cotizacion,
  form,
  lineasCount,
  onFormChange,
  onCambiarEstado,
  onRechazar,
}: PropsTabInfo) {
  const bloqueada = esBloqueada(cotizacion.estado);

  // Actualiza un campo del formulario manteniendo el resto de valores
  const actualizarCampo = <K extends keyof DatosCotizacionNueva>(
    campo: K,
    valor: DatosCotizacionNueva[K],
  ) => {
    onFormChange({ ...form, [campo]: valor });
  };

  return (
    <>
      <div className="drawer-form__ficha">
        <div className="drawer-form__ficha-item">
          <span className="drawer-form__ficha-etiqueta">Cliente / Empresa</span>
          <strong>{etiquetaCliente(cotizacion)}</strong>
        </div>
        <div className="drawer-form__ficha-item">
          <span className="drawer-form__ficha-etiqueta">Destino</span>
          <strong>{cotizacion.destino_nombre ?? 'Sin destino'}</strong>
        </div>
      </div>

      <div className="drawer-form__campo">
        <label className="drawer-form__label">Requisitos del cliente</label>
        <textarea
          className="drawer-form__input drawer-form__textarea"
          value={form.requisitos ?? ''}
          onChange={(e) => actualizarCampo('requisitos', e.target.value)}
          placeholder="Ej: Empresa ACME, 2 buses, 80 empleados, salida flexible mayo..."
          rows={3}
          disabled={bloqueada}
        />
      </div>

      <div className="drawer-form__fila-2">
        <div className="drawer-form__campo">
          <label className="drawer-form__label">
            Precio total (EUR) {lineasCount > 0 && '(calculado)'}
          </label>
          <input
            className="drawer-form__input"
            type="number"
            min={0}
            step={0.01}
            value={form.precio_cotizado_eur ?? ''}
            onChange={(e) =>
              actualizarCampo(
                'precio_cotizado_eur',
                e.target.value ? Number(e.target.value) : null,
              )
            }
            placeholder="0.00"
            readOnly={lineasCount > 0}
            disabled={lineasCount > 0 || bloqueada}
          />
        </div>
        <div className="drawer-form__campo">
          <label className="drawer-form__label">Válida hasta</label>
          <input
            className="drawer-form__input"
            type="date"
            value={form.valida_hasta ? form.valida_hasta.slice(0, 10) : ''}
            onChange={(e) => actualizarCampo('valida_hasta', e.target.value || null)}
            disabled={bloqueada}
          />
        </div>
      </div>

      <div className="drawer-form__campo">
        <label className="drawer-form__label">Estado</label>
        <select
          className="drawer-form__input"
          value={form.estado}
          onChange={(e) => actualizarCampo('estado', e.target.value as EstadoCotizacion)}
          disabled={bloqueada}
        >
          {ESTADOS_COTIZACION.map((s) => (
            <option key={s} value={s}>
              {ETIQUETA_ESTADO[s] ?? s}
            </option>
          ))}
        </select>
      </div>

      {!bloqueada && (
        <div className="cot-drawer__acciones-estado">
          <p className="cot-drawer__acciones-titulo">Acciones rápidas</p>
          <div className="cot-drawer__acciones-grupo">
            {cotizacion.estado === 'solicitada' && (
              <Boton
                variante="secundario"
                tamano="sm"
                onClick={() => onCambiarEstado(cotizacion, 'pendiente')}
                disabled={!cotizacion.precio_cotizado_eur}
                title={!cotizacion.precio_cotizado_eur ? 'Define un precio antes de cambiar a pendiente' : undefined}
              >
                Marcar como pendiente
              </Boton>
            )}
            {cotizacion.estado === 'pendiente' && (
              <Boton
                variante="primario"
                tamano="sm"
                onClick={() => onCambiarEstado(cotizacion, 'aceptada')}
              >
                Aprobar
              </Boton>
            )}
            <Boton variante="peligro" tamano="sm" onClick={() => onRechazar(cotizacion)}>
              Rechazar
            </Boton>
          </div>
        </div>
      )}
    </>
  );
}
