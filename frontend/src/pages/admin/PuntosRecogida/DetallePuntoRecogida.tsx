import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Boton from '../../../components/ui/Boton/Boton';
import { obtenerDetallePuntoRecogida } from '../../../services/puntos_recogida';
import type {
  ClienteVinculadoPuntoRecogida,
  PuntoRecogidaDetalle,
  PuntoRecogidaListado,
} from '../../../types/puntoRecogida';
import { ErrorApi } from '../../../services/api';
import { etiquetaPunto } from '../../../components/puntos-recogida/utils';
import '../Clientes/Clientes.css';

interface DetallePuntoRecogidaProps {
  punto: PuntoRecogidaListado;
  onVolver: () => void;
}

function clientesVinculados(detalle: PuntoRecogidaDetalle): ClienteVinculadoPuntoRecogida[] {
  return detalle.clientes_vinculados ?? detalle.clientes ?? [];
}

function nombreCliente(c: ClienteVinculadoPuntoRecogida): string {
  return `${c.nombre} ${c.apellido}`.trim();
}

export default function DetallePuntoRecogida({ punto, onVolver }: DetallePuntoRecogidaProps) {
  const [detalle, setDetalle] = useState<PuntoRecogidaDetalle | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async (id: number) => {
    setCargando(true);
    setError(null);
    try {
      setDetalle(await obtenerDetallePuntoRecogida(id));
    } catch (err) {
      setError(err instanceof ErrorApi ? err.message : 'No se pudo cargar el detalle.');
      setDetalle(null);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar(punto.id);
  }, [punto.id, cargar]);

  const vinculados = detalle ? clientesVinculados(detalle) : [];
  const clienteIdFallback = punto.cliente_id;

  return (
    <div className="puntos-recogida-admin__detalle-vista">
      <div className="puntos-recogida-admin__detalle-cabecera">
        <div>
          <h2 className="puntos-recogida-admin__detalle-titulo">{etiquetaPunto(punto)}</h2>
          <p className="puntos-recogida-admin__detalle-subtitulo">Domicilio #{punto.id}</p>
        </div>
        <Boton variante="secundario" tamano="sm" onClick={onVolver}>
          Volver al listado
        </Boton>
      </div>

      {cargando && <p className="puntos-recogida-admin__estado">Cargando detalle…</p>}
      {error && <div className="clientes__alerta clientes__alerta--error">{error}</div>}

      {!cargando && detalle && (
        <div className="puntos-recogida-admin__detalle">
          <dl className="puntos-recogida-admin__lista">
            <div>
              <dt>Nombre</dt>
              <dd>{detalle.nombre}</dd>
            </div>
            <div>
              <dt>Dirección</dt>
              <dd>{detalle.direccion ?? '—'}</dd>
            </div>
            <div>
              <dt>Ciudad</dt>
              <dd>{detalle.ciudad ?? '—'}</dd>
            </div>
            <div>
              <dt>Estado</dt>
              <dd>{detalle.estado ?? '—'}</dd>
            </div>
            <div>
              <dt>Referencia</dt>
              <dd>{detalle.notas_referencia ?? detalle.referencia ?? '—'}</dd>
            </div>
            <div>
              <dt>Activo</dt>
              <dd>{detalle.activo === false ? 'No' : 'Sí'}</dd>
            </div>
            <div>
              <dt>Predeterminado</dt>
              <dd>{detalle.es_predeterminado ? 'Sí' : 'No'}</dd>
            </div>
          </dl>

          <section className="puntos-recogida-admin__vinculados">
            <h3>Clientes vinculados</h3>
            {vinculados.length === 0 && !clienteIdFallback ? (
              <p className="puntos-recogida-admin__estado">Sin clientes vinculados.</p>
            ) : (
              <ul className="puntos-recogida-admin__vinculados-lista">
                {vinculados.map((c) => (
                  <li key={c.cliente_id}>
                    <div>
                      <strong>{nombreCliente(c)}</strong>
                      {c.tipo_documento && c.numero_documento && (
                        <span className="puntos-recogida-admin__doc">
                          {c.tipo_documento}-{c.numero_documento}
                        </span>
                      )}
                      {c.es_predeterminado && (
                        <span className="puntos-recogida-admin__badge">Predeterminado</span>
                      )}
                    </div>
                    <Link
                      to={`/admin/clientes?editar=${c.cliente_id}`}
                      className="puntos-recogida-admin__link-cliente"
                    >
                      Gestionar en Clientes
                    </Link>
                  </li>
                ))}
                {vinculados.length === 0 && clienteIdFallback && (
                  <li>
                    <div>
                      <strong>
                        {punto.cliente_nombre || punto.cliente_apellido
                          ? `${punto.cliente_nombre ?? ''} ${punto.cliente_apellido ?? ''}`.trim()
                          : `Cliente #${clienteIdFallback}`}
                      </strong>
                      {punto.cliente_tipo_documento && punto.cliente_numero_documento && (
                        <span className="puntos-recogida-admin__doc">
                          {punto.cliente_tipo_documento}-{punto.cliente_numero_documento}
                        </span>
                      )}
                    </div>
                    <Link
                      to={`/admin/clientes?editar=${clienteIdFallback}`}
                      className="puntos-recogida-admin__link-cliente"
                    >
                      Gestionar en Clientes
                    </Link>
                  </li>
                )}
              </ul>
            )}
          </section>

          <p className="puntos-recogida-admin__nota-consulta">
            Este módulo es solo consulta. Para crear, editar o eliminar domicilios, use el módulo{' '}
            <Link to="/admin/clientes">Clientes</Link>.
          </p>
        </div>
      )}
    </div>
  );
}
