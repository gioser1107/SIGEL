import { PanelDeslizable } from '../../../../components/admin';
import Boton from '../../../../components/ui/Boton/Boton';
import BtnImprimirReporte from '../../../../components/ui/BtnImprimirReporte/BtnImprimirReporte';
import type {
  Cotizacion,
  CotizacionLinea,
  DatosCotizacionNueva,
} from '../../../../types/cotizacion';
import { etiquetaEstado, SIN_DATO, textoVisible } from '../../../../utils/etiquetasNegocio';
import { type LineaFormCotizacion } from '../constants';
import { esBloqueada } from '../utils/formatearCotizacion';
import TabDesgloseCotizacion from './components/TabDesgloseCotizacion';
import TabInfoCotizacion from './components/TabInfoCotizacion';

interface PropsPanelEditar {
  abierto: boolean;
  cotizacion: Cotizacion | null;
  form: DatosCotizacionNueva;
  guardando: boolean;
  errorForm: string | null;
  drawerTab: 'info' | 'desglose';
  lineas: CotizacionLinea[];
  lineaForm: LineaFormCotizacion;
  cargandoLineas: boolean;
  onCerrar: () => void;
  onGuardar: () => void;
  onTabChange: (tab: 'info' | 'desglose') => void;
  onFormChange: (form: DatosCotizacionNueva) => void;
  onLineaFormChange: (form: LineaFormCotizacion) => void;
  onAgregarLinea: () => void;
  onQuitarLinea: (lineaId: number) => void;
  onRechazar: (cot: Cotizacion) => void;
  onConvertir: () => void;
  onImprimir: () => void | Promise<void>;
  imprimiendo?: boolean;
}

export default function PanelEditarCotizacion({
  abierto,
  cotizacion,
  form,
  guardando,
  errorForm,
  drawerTab,
  lineas,
  lineaForm,
  cargandoLineas,
  onCerrar,
  onGuardar,
  onTabChange,
  onFormChange,
  onLineaFormChange,
  onAgregarLinea,
  onQuitarLinea,
  onRechazar,
  onConvertir,
  onImprimir,
  imprimiendo = false,
}: PropsPanelEditar) {
  if (!cotizacion) return null;

  const bloqueada = esBloqueada(cotizacion.estado);
  const sePuedeConvertir = cotizacion.estado === 'pendiente' || cotizacion.estado === 'aceptada';

  return (
    <PanelDeslizable
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={textoVisible(cotizacion.destino_nombre, 'Editar cotización')}
      subtitulo={`${textoVisible(cotizacion.cliente_nombre, SIN_DATO.cliente)} · ${etiquetaEstado(cotizacion.estado)}`}
      ancho="lg"
      pie={
        <>
          <div className="cot-drawer__pie-imprimir">
            <BtnImprimirReporte
              etiqueta="Imprimir PDF"
              deshabilitado={guardando || imprimiendo}
              alImprimir={onImprimir}
            />
          </div>
          <Boton variante="secundario" tamano="sm" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Boton>
          {!bloqueada && (
            <Boton variante="primario" tamano="sm" onClick={onGuardar} disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar cambios'}
            </Boton>
          )}
        </>
      }
    >
      <div className="drawer-form">
        {errorForm && (
          <div className="drawer-form__error" role="alert">
            {errorForm}
          </div>
        )}

        <div className="cot-drawer__tabs">
          <button
            type="button"
            className={drawerTab === 'info' ? 'cot-drawer__tab cot-drawer__tab--activa' : 'cot-drawer__tab'}
            onClick={() => onTabChange('info')}
          >
            Info
          </button>
          <button
            type="button"
            className={
              drawerTab === 'desglose' ? 'cot-drawer__tab cot-drawer__tab--activa' : 'cot-drawer__tab'
            }
            onClick={() => onTabChange('desglose')}
          >
            Ítems
          </button>
        </div>

        {drawerTab === 'info' && (
          <TabInfoCotizacion
            cotizacion={cotizacion}
            form={form}
            onFormChange={onFormChange}
            onRechazar={onRechazar}
          />
        )}

        {drawerTab === 'desglose' && (
          <TabDesgloseCotizacion
            lineas={lineas}
            lineaForm={lineaForm}
            cargando={cargandoLineas}
            bloqueada={bloqueada}
            onLineaFormChange={onLineaFormChange}
            onAgregarLinea={onAgregarLinea}
            onQuitarLinea={onQuitarLinea}
          />
        )}

        {sePuedeConvertir && (
          <button type="button" className="cot-drawer__convertir" onClick={onConvertir}>
            <div className="cot-drawer__convertir-info">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <div>
                <strong>Convertir en reserva</strong>
                <span>Asociar a viaje(s) y crear reserva grupal</span>
              </div>
            </div>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        )}
      </div>
    </PanelDeslizable>
  );
}
