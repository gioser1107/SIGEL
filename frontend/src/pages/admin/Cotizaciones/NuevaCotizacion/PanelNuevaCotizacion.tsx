import { PanelDeslizable, SelectBuscador } from '../../../../components/admin';
import type { OpcionSelectBuscador } from '../../../../components/admin';
import Boton from '../../../../components/ui/Boton/Boton';
import type { DatosCotizacionNueva, EstadoCotizacion } from '../../../../types/cotizacion';
import { ETIQUETA_ESTADO, ESTADOS_COTIZACION } from '../constants';

interface PropsPanelNueva {
  abierto: boolean;
  form: DatosCotizacionNueva;
  guardando: boolean;
  errorForm: string | null;
  clientesOpciones: { id: number; etiqueta: string }[];
  destinosOpciones: OpcionSelectBuscador[];
  cargandoDestinos: boolean;
  onCerrar: () => void;
  onGuardar: () => void;
  onFormChange: (form: DatosCotizacionNueva) => void;
}

// Panel lateral para crear una nueva cotización comercial
export default function PanelNuevaCotizacion({
  abierto,
  form,
  guardando,
  errorForm,
  clientesOpciones,
  destinosOpciones,
  cargandoDestinos,
  onCerrar,
  onGuardar,
  onFormChange,
}: PropsPanelNueva) {
  // Actualiza un campo del formulario manteniendo el resto de valores
  const actualizarCampo = <K extends keyof DatosCotizacionNueva>(
    campo: K,
    valor: DatosCotizacionNueva[K],
  ) => {
    onFormChange({ ...form, [campo]: valor });
  };

  return (
    <PanelDeslizable
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Nueva cotización"
      pie={
        <>
          <Boton variante="secundario" tamano="sm" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Boton>
          <Boton variante="primario" tamano="sm" onClick={onGuardar} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Crear cotización'}
          </Boton>
        </>
      }
    >
      <div className="drawer-form">
        <p className="drawer-form__intro">
          Presupuesto comercial para un cliente o empresa. Define requisitos, precio y vigencia antes de enviarlo.
        </p>
        {errorForm && (
          <div className="drawer-form__error" role="alert">
            {errorForm}
          </div>
        )}

        <div className="drawer-form__campo">
          <label className="drawer-form__label">
            Cliente / Empresa <span className="drawer-form__req">*</span>
          </label>
          <select
            className="drawer-form__input"
            value={form.cliente_id || ''}
            onChange={(e) => actualizarCampo('cliente_id', Number(e.target.value))}
          >
            <option value="">Selecciona un cliente</option>
            {clientesOpciones.map((c) => (
              <option key={c.id} value={c.id}>
                {c.etiqueta}
              </option>
            ))}
          </select>
        </div>

        <div className="drawer-form__campo">
          <label className="drawer-form__label">
            Destino <span className="drawer-form__req">*</span>
          </label>
          <SelectBuscador
            opciones={destinosOpciones}
            valorSeleccionado={form.destino_id || null}
            onSeleccionar={(op) => actualizarCampo('destino_id', op?.valor ?? 0)}
            placeholder="Buscar destino…"
            cargando={cargandoDestinos}
            mensajeVacio="No hay destinos"
          />
        </div>

        <div className="drawer-form__campo">
          <label className="drawer-form__label">Requisitos del cliente</label>
          <textarea
            className="drawer-form__input drawer-form__textarea"
            value={form.requisitos ?? ''}
            onChange={(e) => actualizarCampo('requisitos', e.target.value)}
            placeholder="Ej: Empresa ACME, 2 buses, 80 empleados, salida flexible mayo..."
            rows={3}
          />
        </div>

        <div className="drawer-form__fila-2">
          <div className="drawer-form__campo">
            <label className="drawer-form__label">Precio total (EUR)</label>
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
            />
          </div>
          <div className="drawer-form__campo">
            <label className="drawer-form__label">Válida hasta</label>
            <input
              className="drawer-form__input"
              type="date"
              value={form.valida_hasta ? form.valida_hasta.slice(0, 10) : ''}
              onChange={(e) => actualizarCampo('valida_hasta', e.target.value || null)}
            />
          </div>
        </div>

        <div className="drawer-form__campo">
          <label className="drawer-form__label">Estado</label>
          <select
            className="drawer-form__input"
            value={form.estado}
            onChange={(e) => actualizarCampo('estado', e.target.value as EstadoCotizacion)}
          >
            {ESTADOS_COTIZACION.map((s) => (
              <option key={s} value={s}>
                {ETIQUETA_ESTADO[s] ?? s}
              </option>
            ))}
          </select>
        </div>
      </div>
    </PanelDeslizable>
  );
}
