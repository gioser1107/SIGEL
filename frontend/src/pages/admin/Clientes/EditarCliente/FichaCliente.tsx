import { useEffect, useState, type ReactNode } from 'react';
import { EtiquetaEstado } from '../../../../components/admin';
import { listarPuntosRecogidaCliente } from '../../../../services/puntos_recogida';
import { obtenerReservas } from '../../../../services/reservas';
import type { Cliente } from '../../../../types/cliente';
import type { PuntoRecogida } from '../../../../types/puntoRecogida';
import type { Reserva } from '../../../../types/reservas';
import { codigoReserva, etiquetaEstado } from '../../../../utils/etiquetasNegocio';
import { nombreCompleto } from '../../../../utils/nombrePersona';
import { ETIQUETA_TIPO } from '../constants';
import { inicialesCliente, nombreVisibleCliente } from '../utils/inicialesCliente';
import './FichaCliente.css';

interface ReservaFicha extends Reserva {
  destino_nombre?: string | null;
  fecha_salida?: string | null;
}

interface FichaClienteProps {
  cliente: Cliente;
  activa: boolean;
}

function IconoPersona() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconoTelefono() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function IconoPin() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function IconoCasa() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function IconoCalendario() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function TituloSeccion({ icono, children, contador }: { icono: ReactNode; children: ReactNode; contador?: number }) {
  return (
    <div className="ficha-cliente__seccion-titulo">
      <span className="ficha-cliente__seccion-icono">{icono}</span>
      {children}
      {contador !== undefined && <span className="ficha-cliente__contador">{contador}</span>}
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: ReactNode }) {
  return (
    <div className="ficha-cliente__dato">
      <span className="ficha-cliente__dato-etiqueta">{etiqueta}</span>
      <strong className="ficha-cliente__dato-valor">{valor || '—'}</strong>
    </div>
  );
}

function formatearFechaCorta(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-VE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function FichaCliente({ cliente, activa }: FichaClienteProps) {
  const [puntos, setPuntos] = useState<PuntoRecogida[]>(cliente.puntos_recogida ?? []);
  const [reservas, setReservas] = useState<ReservaFicha[] | null>(null);
  const [cargandoExtra, setCargandoExtra] = useState(false);

  useEffect(() => {
    if (!activa) return;
    let cancelado = false;
    setCargandoExtra(true);

    Promise.allSettled([
      listarPuntosRecogidaCliente(cliente.cliente_id),
      obtenerReservas({ cliente_id: cliente.cliente_id, pagina: 1, limite: 8 }),
    ]).then(([puntosRes, reservasRes]) => {
      if (cancelado) return;
      if (puntosRes.status === 'fulfilled') {
        setPuntos(puntosRes.value);
      }
      if (reservasRes.status === 'fulfilled') {
        setReservas(reservasRes.value.items as ReservaFicha[]);
      } else {
        setReservas(null);
      }
    }).finally(() => {
      if (!cancelado) setCargandoExtra(false);
    });

    return () => {
      cancelado = true;
    };
  }, [activa, cliente.cliente_id]);

  const nombre = nombreVisibleCliente(cliente);
  const contacto = nombreCompleto(cliente.nombre, cliente.apellido);
  const ubicacion = cliente.ciudad && cliente.estado
    ? `${cliente.ciudad}, ${cliente.estado}`
    : cliente.ciudad || cliente.estado || '—';

  return (
    <div className="ficha-cliente">
      <header className="ficha-cliente__hero">
        <div className="ficha-cliente__avatar" aria-hidden="true">
          {inicialesCliente(cliente)}
        </div>
        <div className="ficha-cliente__hero-texto">
          <h3 className="ficha-cliente__nombre">{nombre}</h3>
          {cliente.tipo_cliente === 'juridico' && contacto && contacto !== nombre && (
            <p className="ficha-cliente__contacto">Contacto: {contacto}</p>
          )}
          <p className="ficha-cliente__documento">
            {cliente.tipo_documento}-{cliente.numero_documento}
          </p>
          <div className="ficha-cliente__badges">
            <EtiquetaEstado
              etiqueta={ETIQUETA_TIPO[cliente.tipo_cliente] ?? cliente.tipo_cliente}
              variante={cliente.tipo_cliente === 'juridico' ? 'info' : 'neutro'}
            />
            <span className={`ficha-cliente__portal ${cliente.usuario_id ? 'ficha-cliente__portal--si' : ''}`}>
              {cliente.usuario_id ? 'Con cuenta de portal' : 'Sin cuenta de portal'}
            </span>
          </div>
        </div>
      </header>

      <section className="ficha-cliente__seccion">
        <TituloSeccion icono={<IconoTelefono />}>Contacto</TituloSeccion>
        <div className="ficha-cliente__grid">
          <Dato etiqueta="Teléfono principal" valor={cliente.telefono} />
          <Dato etiqueta="Teléfono secundario" valor={cliente.telefono_secundario} />
          <Dato etiqueta="Correo" valor={cliente.correo} />
          <Dato etiqueta="Dirección" valor={cliente.direccion} />
        </div>
      </section>

      <section className="ficha-cliente__seccion">
        <TituloSeccion icono={<IconoPin />}>Ubicación</TituloSeccion>
        <div className="ficha-cliente__grid">
          <Dato etiqueta="Estado" valor={cliente.estado} />
          <Dato etiqueta="Ciudad" valor={cliente.ciudad} />
          <Dato etiqueta="Ubicación" valor={ubicacion} />
        </div>
      </section>

      {cliente.notas?.trim() && (
        <section className="ficha-cliente__seccion">
          <TituloSeccion icono={<IconoPersona />}>Notas internas</TituloSeccion>
          <p className="ficha-cliente__notas">{cliente.notas}</p>
        </section>
      )}

      <section className="ficha-cliente__seccion">
        <TituloSeccion icono={<IconoCasa />} contador={puntos.length}>
          Puntos de recogida
        </TituloSeccion>
        {puntos.length === 0 ? (
          <p className="ficha-cliente__vacio">
            Sin domicilios registrados. Agrégalos en la pestaña Editar.
          </p>
        ) : (
          <ul className="ficha-cliente__lista">
            {puntos.map((p) => (
              <li key={p.id} className="ficha-cliente__item">
                <div className="ficha-cliente__item-cabecera">
                  <strong>{p.nombre}</strong>
                  {p.es_predeterminado && (
                    <span className="ficha-cliente__chip">Predeterminado</span>
                  )}
                </div>
                <span className="ficha-cliente__item-meta">
                  {[p.direccion, p.ciudad, p.estado].filter(Boolean).join(' · ') || 'Sin dirección'}
                </span>
                {(p.notas_referencia || p.referencia) && (
                  <span className="ficha-cliente__item-nota">{p.notas_referencia || p.referencia}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {reservas !== null && (
        <section className="ficha-cliente__seccion">
          <TituloSeccion icono={<IconoCalendario />} contador={reservas.length}>
            Reservas recientes
          </TituloSeccion>
          {cargandoExtra && reservas.length === 0 ? (
            <p className="ficha-cliente__vacio">Cargando reservas…</p>
          ) : reservas.length === 0 ? (
            <p className="ficha-cliente__vacio">Este cliente aún no tiene reservas.</p>
          ) : (
            <ul className="ficha-cliente__lista">
              {reservas.map((r) => (
                <li key={r.id} className="ficha-cliente__item">
                  <div className="ficha-cliente__item-cabecera">
                    <strong>{r.destino_nombre?.trim() || codigoReserva(r.id)}</strong>
                    <EtiquetaEstado etiqueta={etiquetaEstado(r.estado)} />
                  </div>
                  <span className="ficha-cliente__item-meta">
                    {codigoReserva(r.id)}
                    {r.fecha_salida
                      ? ` · Salida ${formatearFechaCorta(r.fecha_salida)}`
                      : ` · Reservada ${formatearFechaCorta(r.fecha_reserva)}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
