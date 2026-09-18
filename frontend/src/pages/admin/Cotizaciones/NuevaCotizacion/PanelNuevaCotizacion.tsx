import { PanelDeslizable, SelectBuscador } from '../../../../components/admin';
import type { OpcionSelectBuscador } from '../../../../components/admin';
import Boton from '../../../../components/ui/Boton/Boton';
import type { CotizacionLinea, DatosCotizacionNueva } from '../../../../types/cotizacion';
import { type LineaFormCotizacion } from '../constants';
import TabDesgloseCotizacion from '../EditarCotizacion/components/TabDesgloseCotizacion';

interface PropsPanelNueva {
  abierto: boolean;
  form: DatosCotizacionNueva;
  lineas: CotizacionLinea[];
  lineaForm: LineaFormCotizacion;
  guardando: boolean;
  errorForm: string | null;
  clientesOpciones: OpcionSelectBuscador[];
  cargandoClientes: boolean;
  destinosOpciones: OpcionSelectBuscador[];
  cargandoDestinos: boolean;
  onCerrar: () => void;
  onGuardar: () => void;
  onFormChange: (form: DatosCotizacionNueva) => void;
  onLineaFormChange: (form: LineaFormCotizacion) => void;
  onAgregarLinea: () => void;
  onQuitarLinea: (lineaId: number) => void;
}

export default function PanelNuevaCotizacion({
  abierto,
  form,
  lineas,
  lineaForm,
  guardando,
  errorForm,
  clientesOpciones,
  cargandoClientes,
  destinosOpciones,
  cargandoDestinos,
  onCerrar,
  onGuardar,
  onFormChange,
  onLineaFormChange,
  onAgregarLinea,
  onQuitarLinea,
}: PropsPanelNueva) {
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
      ancho="lg"
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
        {errorForm && (
          <div className="drawer-form__error" role="alert">
            {errorForm}
          </div>
        )}

        <div className="drawer-form__campo">
          <label className="drawer-form__label">
            Cliente / Empresa <span className="drawer-form__req">*</span>
          </label>
          <SelectBuscador
            opciones={clientesOpciones}
            valorSeleccionado={form.cliente_id || null}
            onSeleccionar={(op) => actualizarCampo('cliente_id', op?.valor ?? 0)}
            placeholder="Buscar cliente…"
            cargando={cargandoClientes}
            mensajeVacio="No hay clientes registrados"
          />
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
          <label className="drawer-form__label">
            Requisitos del cliente <span className="drawer-form__req">*</span>
          </label>
          <textarea
            className="drawer-form__input drawer-form__textarea"
            value={form.requisitos ?? ''}
            onChange={(e) => actualizarCampo('requisitos', e.target.value.slice(0, 1000))}
            maxLength={1000}
            placeholder="Ej: Grupo de 40 de Barquisimeto, salida a Canaima en octubre…"
            rows={3}
          />
        </div>

        <div className="drawer-form__fila-2">
          <div className="drawer-form__campo">
            <label className="drawer-form__label">
              Válida hasta <span className="drawer-form__req">*</span>
            </label>
            <input
              className="drawer-form__input"
              type="date"
              value={form.valida_hasta ? form.valida_hasta.slice(0, 10) : ''}
              onChange={(e) => actualizarCampo('valida_hasta', e.target.value || null)}
            />
          </div>
          <div className="drawer-form__campo">
            <label className="drawer-form__label">Modalidad</label>
            <select
              className="drawer-form__input"
              value={form.modalidad ?? 'individual'}
              onChange={(e) => actualizarCampo('modalidad', e.target.value)}
            >
              <option value="individual">Individual</option>
              <option value="grupo">Grupo</option>
              <option value="propio">Propio</option>
            </select>
          </div>
        </div>

        <div className="cot-nueva__seccion-items">
          <p className="cot-nueva__seccion-titulo">Ítems</p>
          <TabDesgloseCotizacion
            lineas={lineas}
            lineaForm={lineaForm}
            onLineaFormChange={onLineaFormChange}
            onAgregarLinea={onAgregarLinea}
            onQuitarLinea={onQuitarLinea}
          />
        </div>
      </div>
    </PanelDeslizable>
  );
}
