import { EtiquetaEstado, PanelDeslizable } from '../../../../components/admin';
import type { DetalleBitacora } from '../../../../types/bitacora';
import { ETIQUETA_ACCION, ETIQUETA_MODULO } from '../constants';
import {
  etiquetaUsuario,
  formatFechaHora,
  resolverVarianteAccion,
} from '../utils/formatearBitacora';

interface PropsPanelDetalle {
  abierto: boolean;
  cargando: boolean;
  entrada: DetalleBitacora | null;
  onCerrar: () => void;
}

// Muestra el panel lateral con el detalle completo de un registro de bitácora
export default function PanelDetalleBitacora({
  abierto,
  cargando,
  entrada,
  onCerrar,
}: PropsPanelDetalle) {
  return (
    <PanelDeslizable
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Detalle del registro"
      subtitulo={
        entrada
          ? `Evento #${entrada.id} — ${formatFechaHora(entrada.creado_en)}`
          : 'Cargando...'
      }
      ancho="lg"
    >
      {cargando && (
        <p className="bitacora__detalle-cargando">Cargando detalle...</p>
      )}

      {entrada && !cargando && (
        <div className="bitacora__detalle">
          <div className="bitacora__detalle-grid">
            <div className="bitacora__detalle-campo">
              <span className="bitacora__detalle-etiqueta">Módulo</span>
              <EtiquetaEstado
                etiqueta={ETIQUETA_MODULO[entrada.modulo] ?? entrada.modulo}
                variante="info"
              />
            </div>
            <div className="bitacora__detalle-campo">
              <span className="bitacora__detalle-etiqueta">Acción</span>
              <EtiquetaEstado
                etiqueta={ETIQUETA_ACCION[entrada.accion] ?? entrada.accion}
                variante={resolverVarianteAccion(entrada.accion)}
              />
            </div>
            <div className="bitacora__detalle-campo">
              <span className="bitacora__detalle-etiqueta">Tabla afectada</span>
              <span>{entrada.tabla_afectada ?? '—'}</span>
            </div>
            <div className="bitacora__detalle-campo">
              <span className="bitacora__detalle-etiqueta">Registro</span>
              <span>{entrada.registro_id ?? '—'}</span>
            </div>
            <div className="bitacora__detalle-campo">
              <span className="bitacora__detalle-etiqueta">Usuario</span>
              <span>{etiquetaUsuario(entrada)}</span>
            </div>
            <div className="bitacora__detalle-campo bitacora__detalle-campo--completo">
              <span className="bitacora__detalle-etiqueta">Resumen</span>
              <span>{entrada.resumen}</span>
            </div>
          </div>

          {entrada.detalle && (
            <div className="bitacora__detalle-json">
              <span className="bitacora__detalle-etiqueta">Detalle técnico</span>
              <pre className="bitacora__detalle-pre">
                {JSON.stringify(entrada.detalle, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </PanelDeslizable>
  );
}
