import Boton from '../../ui/Boton/Boton';
import { etiquetaPasajero, pasajeroCompleto, type PasajeroPublico } from './pasajeroPublico';

interface PropsListaResumenAcompanantes {
  pasajeros: PasajeroPublico[];
  recargoMenorEur: number;
  onEditar: (pasajero: PasajeroPublico) => void;
  onEliminar: (id: number) => void;
  onAgregar: () => void;
}

export default function ListaResumenAcompanantes({
  pasajeros,
  recargoMenorEur,
  onEditar,
  onEliminar,
  onAgregar,
}: PropsListaResumenAcompanantes) {
  return (
    <div className="fp-acompanantes">
      <div className="fp-acompanantes__cabecera">
        <div>
          <h4 className="fp-card__titulo">Acompañantes</h4>
          <p className="fp-card__subtitulo">
            Agrega las personas que viajan contigo. Los adultos necesitan asiento propio; los menores no ocupan puesto.
          </p>
        </div>
        <Boton type="button" variante="secundario" tamano="sm" onClick={onAgregar}>
          + Añadir
        </Boton>
      </div>

      {pasajeros.length === 0 ? (
        <p className="fp-acompanantes__vacio">
          Solo viajas tú. Pulsa «Añadir» si viaja alguien más contigo.
        </p>
      ) : (
        <ul className="fp-acompanantes__lista">
          {pasajeros.map((p, i) => {
            const completo = pasajeroCompleto(p);
            const doc = p.ficha.numero_documento.trim();
            return (
              <li key={p.id} className="fp-acompanantes__item">
                <div className="fp-acompanantes__info">
                  <span className="fp-acompanantes__numero">{i + 1}</span>
                  <div>
                    <strong className="fp-acompanantes__nombre">{etiquetaPasajero(p)}</strong>
                    <p className="fp-acompanantes__meta">
                      {doc ? `${p.ficha.tipo_documento}-${doc}` : 'Documento pendiente'}
                      {p.es_menor && recargoMenorEur > 0 && (
                        <span className="fp-acompanantes__menor">
                          · Menor (+€{recargoMenorEur.toFixed(2)})
                        </span>
                      )}
                    </p>
                    <span
                      className={`fp-acompanantes__estado ${
                        completo ? 'fp-acompanantes__estado--ok' : 'fp-acompanantes__estado--pendiente'
                      }`}
                    >
                      {completo ? 'Ficha completa' : 'Datos incompletos'}
                    </span>
                  </div>
                </div>
                <div className="fp-acompanantes__acciones">
                  <button
                    type="button"
                    className="fp-acompanantes__btn"
                    onClick={() => onEditar(p)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="fp-acompanantes__btn fp-acompanantes__btn--peligro"
                    onClick={() => onEliminar(p.id)}
                    aria-label={`Eliminar ${etiquetaPasajero(p)}`}
                  >
                    Quitar
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
