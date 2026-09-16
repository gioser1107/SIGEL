import { useState } from 'react';
import Boton from '../../ui/Boton/Boton';
import CroquisUnidad from '../../croquis/CroquisUnidad';
import type { AsientoViaje, RespuestaAsientosViaje } from '../../../types/viaje';
import './MapaAsientos.css';

interface MapaAsientosProps {
  cantidadPuestos: number;
  alConfirmar: (asientosSeleccionados: number[]) => void;
  alRegresar: () => void;
  esAdmin?: boolean;
  asientos?: AsientoViaje[];
  croquis?: RespuestaAsientosViaje['croquis'];
}

export default function MapaAsientos({
  cantidadPuestos,
  alConfirmar,
  alRegresar,
  esAdmin = false,
  asientos,
  croquis,
}: MapaAsientosProps) {
  const [asientosSeleccionados, setAsientosSeleccionados] = useState<number[]>([]);
  const [errorConfirmacion, setErrorConfirmacion] = useState<string | null>(null);

  const usarDatosReales = asientos && asientos.length > 0;
  const asientosMapa = usarDatosReales ? asientos : asientosMock();
  const idsOcupados = new Set(asientosMapa.filter((a) => a.ocupado).map((a) => a.id));

  const numeroPorId = new Map(asientosMapa.map((a) => [a.id, a.numero]));

  const alternarAsiento = (asientoId: number) => {
    if (idsOcupados.has(asientoId)) return;
    if (asientosSeleccionados.includes(asientoId)) {
      setAsientosSeleccionados(asientosSeleccionados.filter((s) => s !== asientoId));
    } else {
      if (asientosSeleccionados.length >= cantidadPuestos) return;
      setAsientosSeleccionados([...asientosSeleccionados, asientoId]);
    }
    setErrorConfirmacion(null);
  };

  const manejarConfirmacion = () => {
    if (asientosSeleccionados.length !== cantidadPuestos) {
      setErrorConfirmacion(
        `Debes seleccionar exactamente ${cantidadPuestos} asiento${cantidadPuestos === 1 ? '' : 's'}.`,
      );
      return;
    }
    setErrorConfirmacion(null);
    alConfirmar(asientosSeleccionados);
  };

  const yaAlcanzoLimite = asientosSeleccionados.length >= cantidadPuestos;
  const etiquetasSeleccionadas = asientosSeleccionados
    .map((id) => numeroPorId.get(id) ?? String(id))
    .join(', ');

  return (
    <div className="mapa-asientos">
      {!esAdmin && (
        <div className="mapa-asientos__header">
          <span className="mapa-asientos__tag">Paso 2</span>
          <h2 className="mapa-asientos__title">Selección de asientos</h2>
          <p className="mapa-asientos__subtitle">
            Selecciona {cantidadPuestos} {cantidadPuestos === 1 ? 'puesto' : 'puestos'} en la unidad de transporte.
          </p>
        </div>
      )}

      <div className="mapa-asientos__legend">
        <div className="mapa-asientos__legend-item">
          <div className="mapa-asientos__seat-sample mapa-asientos__seat-sample--available" />
          <span>Disponible</span>
        </div>
        <div className="mapa-asientos__legend-item">
          <div className="mapa-asientos__seat-sample mapa-asientos__seat-sample--selected" />
          <span>Seleccionado</span>
        </div>
        <div className="mapa-asientos__legend-item">
          <div className="mapa-asientos__seat-sample mapa-asientos__seat-sample--occupied" />
          <span>Ocupado</span>
        </div>
      </div>

      <div className="mapa-asientos__bus-wrapper">
        <CroquisUnidad
          asientos={asientosMapa}
          croquis={croquis}
          idsOcupados={idsOcupados}
          idsSeleccionados={asientosSeleccionados}
          idsBloqueados={yaAlcanzoLimite}
          onClickAsiento={(asiento) => {
            if (asiento.id == null) return;
            alternarAsiento(asiento.id);
          }}
        />
      </div>

      <div className="mapa-asientos__ticket-summary">
        <div className="mapa-asientos__ticket-row">
          <span className="mapa-asientos__ticket-label">Asientos seleccionados</span>
          <span className="mapa-asientos__ticket-value">
            {asientosSeleccionados.length > 0 ? etiquetasSeleccionadas : '—'}
          </span>
        </div>
        <div className="mapa-asientos__ticket-row">
          <span className="mapa-asientos__ticket-label">Seleccionados</span>
          <span className="mapa-asientos__ticket-counter">
            {asientosSeleccionados.length} / {cantidadPuestos}
          </span>
        </div>
      </div>

      {errorConfirmacion && (
        <p className="fp-card__error fp-card__error--inline" role="alert">
          {errorConfirmacion}
        </p>
      )}
      <div className="mapa-asientos__actions">
        <Boton type="button" variante="fantasma" onClick={alRegresar} className="mapa-asientos__back-btn">
          Atrás
        </Boton>
        <Boton
          type="button"
          variante="primario"
          onClick={manejarConfirmacion}
          disabled={asientosSeleccionados.length !== cantidadPuestos}
          className="mapa-asientos__confirm-btn"
        >
          Confirmar Asientos
        </Boton>
      </div>
    </div>
  );
}

function asientosMock(): AsientoViaje[] {
  const ocupados = new Set([3, 4, 8, 15, 16, 21, 22]);
  return Array.from({ length: 24 }, (_, i) => ({
    id: i + 1,
    numero: String(i + 1),
    posicion: 'otro',
    fila: null,
    columna: null,
    ocupado: ocupados.has(i + 1),
  }));
}
