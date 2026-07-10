import { PanelDeslizable, SelectBuscador } from '../../../../components/admin';
import type { OpcionSelectBuscador } from '../../../../components/admin';
import Boton from '../../../../components/ui/Boton/Boton';
import type { DatosViajeNuevo } from '../../../../types/viaje';
import CampoGuiasViaje from '../components/CampoGuiasViaje';

interface PropsPanelNuevo {
  abierto: boolean;
  form: DatosViajeNuevo;
  guardando: boolean;
  errorForm: string | null;
  destinosOpciones: OpcionSelectBuscador[];
  unidadesOpciones: OpcionSelectBuscador[];
  guiasOpciones: { id: number; etiqueta: string }[];
  cargandoGuias: boolean;
  cargandoDestinos: boolean;
  cargandoUnidades: boolean;
  onCerrar: () => void;
  onGuardar: () => void;
  onFormChange: (form: DatosViajeNuevo) => void;
}

// Panel lateral para crear un nuevo viaje con datos básicos
export default function PanelNuevoViaje({
  abierto,
  form,
  guardando,
  errorForm,
  destinosOpciones,
  unidadesOpciones,
  guiasOpciones,
  cargandoGuias,
  cargandoDestinos,
  cargandoUnidades,
  onCerrar,
  onGuardar,
  onFormChange,
}: PropsPanelNuevo) {
  // Actualiza un campo del formulario manteniendo el resto de valores
  const actualizarCampo = <K extends keyof DatosViajeNuevo>(
    campo: K,
    valor: DatosViajeNuevo[K],
  ) => {
    onFormChange({ ...form, [campo]: valor });
  };

  return (
    <PanelDeslizable
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Nuevo viaje"
      pie={
        <>
          <Boton variante="secundario" tamano="sm" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Boton>
          <Boton variante="primario" tamano="sm" onClick={onGuardar} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Crear viaje'}
          </Boton>
        </>
      }
    >
      <div className="drawer-form">
        <p className="drawer-form__intro">
          Define a dónde va el viaje, qué bus asignas y cuándo sale. Al crearlo quedará en estado planificado.
        </p>
        {errorForm && (
          <div className="drawer-form__error" role="alert">
            {errorForm}
          </div>
        )}

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
            Unidad de transporte <span className="drawer-form__req">*</span>
          </label>
          <SelectBuscador
            opciones={unidadesOpciones}
            valorSeleccionado={form.unidad_id || null}
            onSeleccionar={(op) => actualizarCampo('unidad_id', op?.valor ?? 0)}
            placeholder="Buscar placa o modelo…"
            cargando={cargandoUnidades}
            mensajeVacio="No hay unidades"
          />
        </div>

        <CampoGuiasViaje
          guiasIds={form.guias_ids ?? []}
          guiaPrincipalId={form.guia_principal_id ?? null}
          guiasOpciones={guiasOpciones}
          cargando={cargandoGuias}
          onChange={(guias_ids, guia_principal_id) =>
            onFormChange({ ...form, guias_ids, guia_principal_id })
          }
        />

        <div className="drawer-form__fila-2">
          <div className="drawer-form__campo">
            <label className="drawer-form__label">
              Fecha salida <span className="drawer-form__req">*</span>
            </label>
            <input
              className="drawer-form__input"
              type="datetime-local"
              value={form.fecha_salida ? form.fecha_salida.slice(0, 16) : ''}
              onChange={(e) => actualizarCampo('fecha_salida', e.target.value)}
            />
          </div>
          <div className="drawer-form__campo">
            <label className="drawer-form__label">Fecha regreso</label>
            <input
              className="drawer-form__input"
              type="datetime-local"
              value={form.fecha_regreso ? form.fecha_regreso.slice(0, 16) : ''}
              onChange={(e) => actualizarCampo('fecha_regreso', e.target.value || null)}
            />
          </div>
        </div>
      </div>
    </PanelDeslizable>
  );
}
