import { useEffect, useState } from 'react';
import { PanelDeslizable } from '../../../../components/admin';
import Boton from '../../../../components/ui/Boton/Boton';
import type { PasajeroManifiesto } from '../../../../types/abordaje';
import { nombreCompleto } from '../../../../utils/nombrePersona';
import { ETIQUETA_ESTADO_ABORDAJE } from '../constants';

interface PropsPanelEditarAbordaje {
  abierto: boolean;
  pasajero: PasajeroManifiesto | null;
  cargando: boolean;
  onCerrar: () => void;
  onGuardar: (estado: 'abordado' | 'no_presentado', notas: string) => Promise<void>;
}

export default function PanelEditarAbordaje({
  abierto,
  pasajero,
  cargando,
  onCerrar,
  onGuardar,
}: PropsPanelEditarAbordaje) {
  const [estado, setEstado] = useState<'abordado' | 'no_presentado'>('abordado');
  const [notas, setNotas] = useState('');

  useEffect(() => {
    if (!pasajero?.abordaje) return;
    setEstado(
      pasajero.abordaje.estado === 'no_presentado' ? 'no_presentado' : 'abordado',
    );
    setNotas(pasajero.abordaje.notas ?? '');
  }, [pasajero]);

  if (!pasajero) return null;

  return (
    <PanelDeslizable
      abierto={abierto}
      titulo="Corregir abordaje"
      subtitulo={nombreCompleto(pasajero.cliente.nombre, pasajero.cliente.apellido)}
      onCerrar={onCerrar}
      pie={
        <div className="abordaje-panel__pie">
          <Boton variante="secundario" tamano="sm" onClick={onCerrar} disabled={cargando}>
            Cancelar
          </Boton>
          <Boton
            variante="primario"
            tamano="sm"
            disabled={cargando}
            onClick={() => void onGuardar(estado, notas.trim())}
          >
            Guardar cambios
          </Boton>
        </div>
      }
    >
      <div className="drawer-form">
        <div className="drawer-form__grupo">
          <label className="drawer-form__label" htmlFor="estado-abordaje-editar">
            Estado
          </label>
          <select
            id="estado-abordaje-editar"
            className="drawer-form__input"
            value={estado}
            onChange={(e) => setEstado(e.target.value as 'abordado' | 'no_presentado')}
          >
            <option value="abordado">{ETIQUETA_ESTADO_ABORDAJE.abordado}</option>
            <option value="no_presentado">{ETIQUETA_ESTADO_ABORDAJE.no_presentado}</option>
          </select>
        </div>
        <div className="drawer-form__grupo">
          <label className="drawer-form__label" htmlFor="notas-abordaje-editar">
            Notas
          </label>
          <textarea
            id="notas-abordaje-editar"
            className="drawer-form__input"
            rows={4}
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
          />
        </div>
      </div>
    </PanelDeslizable>
  );
}
