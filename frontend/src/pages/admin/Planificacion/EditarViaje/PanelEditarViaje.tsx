import { PanelDeslizable } from '../../../../components/admin';
import Boton from '../../../../components/ui/Boton/Boton';
import type { Costo, DatosViajeNuevo, Viaje } from '../../../../types/viaje';
import { PESTANIAS_PANEL } from '../constants';
import { textoVisible } from '../../../../utils/etiquetasNegocio';
import { formatFecha } from '../utils/formatearViaje';
import TabCostos from './components/TabCostos';
import TabInfoViaje from './components/TabInfoViaje';
import TabRutaRecogida from './components/TabRutaRecogida';

interface PropsNuevoCosto {
  categoria: string;
  monto_eur: string;
  descripcion: string;
}

interface PropsPanelEditar {
  abierto: boolean;
  viaje: Viaje | null;
  form: DatosViajeNuevo;
  guardando: boolean;
  errorForm: string | null;
  tabActiva: string;
  costos: Costo[];
  cargandoDetalle: boolean;
  totalEur: number;
  nuevoCosto: PropsNuevoCosto;
  guardandoCosto: boolean;
  guiasOpciones: { id: number; etiqueta: string }[];
  cargandoGuias: boolean;
  onCerrar: () => void;
  onGuardar: () => void;
  onTabChange: (tab: string) => void;
  onFormChange: (form: DatosViajeNuevo) => void;
  onNuevoCostoChange: (costo: PropsNuevoCosto) => void;
  onAgregarCosto: () => void;
  onEliminarCosto: (costoId: number) => void;
}

export default function PanelEditarViaje({
  abierto,
  viaje,
  form,
  guardando,
  errorForm,
  tabActiva,
  costos,
  cargandoDetalle,
  totalEur,
  nuevoCosto,
  guardandoCosto,
  guiasOpciones,
  cargandoGuias,
  onCerrar,
  onGuardar,
  onTabChange,
  onFormChange,
  onNuevoCostoChange,
  onAgregarCosto,
  onEliminarCosto,
}: PropsPanelEditar) {
  if (!viaje) return null;

  return (
    <PanelDeslizable
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={textoVisible(viaje.destino_nombre, 'Editar viaje')}
      subtitulo={formatFecha(viaje.fecha_salida)}
      ancho={tabActiva === 'paradas' ? 'xl' : 'lg'}
      pestanias={PESTANIAS_PANEL}
      pestaniaActiva={tabActiva}
      onPestaniaChange={onTabChange}
      pie={
        tabActiva === 'info' ? (
          <>
            <Boton variante="secundario" tamano="sm" onClick={onCerrar} disabled={guardando}>
              Cancelar
            </Boton>
            <Boton variante="primario" tamano="sm" onClick={onGuardar} disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar cambios'}
            </Boton>
          </>
        ) : undefined
      }
    >
      {errorForm && tabActiva === 'info' && (
        <div className="drawer-form__error" role="alert">
          {errorForm}
        </div>
      )}

      {tabActiva === 'info' && (
        <TabInfoViaje
          viaje={viaje}
          form={form}
          guiasOpciones={guiasOpciones}
          cargandoGuias={cargandoGuias}
          onFormChange={onFormChange}
        />
      )}

      {tabActiva === 'paradas' && (
        <TabRutaRecogida
          viajeId={viaje.id}
          fechaSalida={form.fecha_salida || viaje.fecha_salida}
          activo={abierto && tabActiva === 'paradas'}
        />
      )}

      {tabActiva === 'costos' && (
        <TabCostos
          costos={costos}
          totalEur={totalEur}
          cargando={cargandoDetalle}
          nuevoCosto={nuevoCosto}
          guardando={guardandoCosto}
          onNuevoCostoChange={onNuevoCostoChange}
          onAgregar={onAgregarCosto}
          onEliminar={onEliminarCosto}
        />
      )}
    </PanelDeslizable>
  );
}
