import { useState } from 'react';
import { subirPartidaNacimiento } from '../../../services/creditos';
import { resolverPoliticaMenor } from '../../../utils/politicaMenor';
import { resolverUrlArchivo } from '../../../utils/resolverUrlArchivo';

interface Props {
  idPrefijo: string;
  esMenor: boolean;
  fechaNacimiento: string;
  ocupaAsiento: boolean;
  partidaUrl: string | null;
  recargoMenorEur: number;
  onToggleMenor: (esMenor: boolean) => void;
  onFechaNacimiento: (fecha: string) => void;
  onOcupaAsiento: (ocupa: boolean) => void;
  onPartidaUrl: (url: string | null) => void;
}

export default function CamposPoliticaMenor({
  idPrefijo,
  esMenor,
  fechaNacimiento,
  ocupaAsiento,
  partidaUrl,
  recargoMenorEur,
  onToggleMenor,
  onFechaNacimiento,
  onOcupaAsiento,
  onPartidaUrl,
}: Props) {
  const [subiendo, setSubiendo] = useState(false);
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
  const politica = resolverPoliticaMenor(esMenor, fechaNacimiento, ocupaAsiento);
  const recargoAplica = esMenor && !politica.ocupa_asiento && recargoMenorEur > 0;

  const manejarArchivo = async (archivo: File | undefined) => {
    if (!archivo) {
      onPartidaUrl(null);
      return;
    }
    setSubiendo(true);
    setErrorArchivo(null);
    try {
      const url = await subirPartidaNacimiento(archivo);
      onPartidaUrl(url);
    } catch (err) {
      setErrorArchivo(err instanceof Error ? err.message : 'No se pudo subir la partida.');
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div className="fp-politica-menor">
      <label className="fp-menor-prioridad__label">
        <input
          type="checkbox"
          className="fp-menor-prioridad__check"
          checked={esMenor}
          onChange={(e) => onToggleMenor(e.target.checked)}
        />
        <span className="fp-menor-prioridad__texto">
          <strong>¿Es menor de edad?</strong>
          <span>Niños de 1 a 5 años viajan en las piernas (no ocupan asiento) y pagan recargo.</span>
        </span>
      </label>

      {esMenor && (
        <div className="fp-politica-menor__campos">
          <div className="fp-politica-menor__campo">
            <label htmlFor={`${idPrefijo}-fecha-nac`}>Fecha de nacimiento</label>
            <input
              id={`${idPrefijo}-fecha-nac`}
              type="date"
              value={fechaNacimiento}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => onFechaNacimiento(e.target.value)}
            />
          </div>

          <label className="campo-checkbox">
            <input
              type="checkbox"
              checked={politica.ocupa_asiento}
              disabled={politica.edad != null && politica.edad > 5}
              onChange={(e) => onOcupaAsiento(e.target.checked)}
            />
            Ocupa asiento propio
          </label>

          {politica.enPiernas && (
            <p className="fp-politica-menor__aviso">
              Viaja en las piernas de un adulto. No se le asigna asiento.
            </p>
          )}
          {recargoAplica && (
            <span className="fp-menor-prioridad__recargo">
              +€{recargoMenorEur.toFixed(2)} de recargo
            </span>
          )}

          <div className="fp-politica-menor__campo">
            <label htmlFor={`${idPrefijo}-partida`}>Partida de nacimiento (PDF o imagen)</label>
            <input
              id={`${idPrefijo}-partida`}
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => void manejarArchivo(e.target.files?.[0])}
            />
            {subiendo && <p className="fp-politica-menor__aviso">Subiendo archivo…</p>}
            {errorArchivo && <p className="fp-card__error">{errorArchivo}</p>}
            {partidaUrl && !subiendo && (
              <a href={resolverUrlArchivo(partidaUrl)} target="_blank" rel="noreferrer">
                Ver partida adjunta
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
