/**
 * MisSolicitudes — Página Kanban de cotizaciones / solicitudes del cliente.
 *
 * El cliente puede:
 *  - Crear una nueva cotización (destino + requisitos)
 *  - Ver sus cotizaciones agrupadas por estado en un tablero Kanban
 *
 * Columnas Kanban:
 *  Solicitadas → estado 'solicitada'
 *  Respondidas → estado 'pendiente' | 'aceptada'
 *  Cerradas    → estado 'vencida' | 'cancelada'
 */

import { useCallback, useEffect, useState } from 'react';
import {
  crearCotizacion,
  obtenerCotizaciones,
  obtenerResumenLineasCotizacion,
} from '../../../services/cotizaciones';
import { obtenerDestinosCatalogo } from '../../../services/catalogo';
import type { DestinoCatalogo } from '../../../services/catalogo';
import type { Cotizacion, EstadoCotizacion, ResumenLineasCotizacion } from '../../../types/cotizacion';
import { LIMITE_PAGINA_MAX } from '../../../types/paginacion';
import { formatearEuro } from '../../../utils/formatoMoneda';
import './MisSolicitudes.css';

/* ─── Configuración de badges por estado ─── */
const BADGE_CONFIG: Record<EstadoCotizacion, { label: string; clase: string }> = {
  solicitada: { label: 'Solicitada', clase: 'kanban__badge--solicitada' },
  pendiente: { label: 'Cotizada', clase: 'kanban__badge--pendiente' },
  aceptada: { label: 'Aceptada', clase: 'kanban__badge--aceptada' },
  vencida: { label: 'Vencida', clase: 'kanban__badge--vencida' },
  cancelada: { label: 'Cancelada', clase: 'kanban__badge--cancelada' },
};

/* ─── Definición de columnas Kanban ─── */
interface ColumnaKanban {
  id: string;
  titulo: string;
  icono: string;
  indicadorClase: string;
  estados: EstadoCotizacion[];
  vacioIcono: string;
  vacioTexto: string;
}

const COLUMNAS: ColumnaKanban[] = [
  {
    id: 'solicitadas',
    titulo: 'Solicitadas',
    icono: '📝',
    indicadorClase: 'kanban__columna-indicador--solicitadas',
    estados: ['solicitada'],
    vacioIcono: '📝',
    vacioTexto: 'No tienes solicitudes pendientes',
  },
  {
    id: 'respondidas',
    titulo: 'Respondidas',
    icono: '📨',
    indicadorClase: 'kanban__columna-indicador--respondidas',
    estados: ['pendiente', 'aceptada'],
    vacioIcono: '📨',
    vacioTexto: 'Aún no hay respuestas',
  },
  {
    id: 'cerradas',
    titulo: 'Cerradas',
    icono: '🕐',
    indicadorClase: 'kanban__columna-indicador--cerradas',
    estados: ['vencida', 'cancelada'],
    vacioIcono: '📂',
    vacioTexto: 'Sin solicitudes cerradas',
  },
];

const ETIQUETA_CATEGORIA: Record<string, string> = {
  combustible: 'Combustible',
  logistica: 'Logística',
  pago_guia: 'Pago guía',
  alimentacion: 'Alimentación',
  peajes: 'Peajes',
  otro: 'Otro',
};

/* ─── Helpers ─── */
function formatearFechaCotizacion(fechaISO: string): string {
  const d = new Date(fechaISO);
  const dia = d.getDate().toString().padStart(2, '0');
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const mes = meses[d.getMonth()];
  const año = d.getFullYear();
  return `${dia} ${mes} ${año}`;
}

function formatearFechaValidez(fechaISO: string): string {
  const d = new Date(fechaISO);
  const dia = d.getDate().toString().padStart(2, '0');
  const mes = (d.getMonth() + 1).toString().padStart(2, '0');
  const año = d.getFullYear();
  return `${dia}/${mes}/${año}`;
}

/* ─── Componente de Tarjeta individual ─── */
function TarjetaCotizacion({
  cotizacion,
  resumen,
}: {
  cotizacion: Cotizacion;
  resumen?: ResumenLineasCotizacion | null;
}) {
  const badge = BADGE_CONFIG[cotizacion.estado];
  const mostrarDesglose = resumen && resumen.por_categoria.length > 0;

  return (
    <article className="kanban__tarjeta">
      <div className="kanban__tarjeta-top">
        <span className="kanban__tarjeta-destino">{cotizacion.destino_nombre}</span>
        <span className={`kanban__badge ${badge.clase}`}>{badge.label}</span>
      </div>

      <p className="kanban__tarjeta-requisitos">{cotizacion.requisitos}</p>

      {mostrarDesglose && (
        <ul className="kanban__tarjeta-desglose">
          {resumen.por_categoria.map((item) => (
            <li key={item.categoria}>
              <span>{ETIQUETA_CATEGORIA[item.categoria] ?? item.categoria}</span>
              <span>{formatearEuro(item.monto_eur)}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="kanban__tarjeta-tear" />

      <div className="kanban__tarjeta-footer">
        <span className="kanban__tarjeta-fecha">
          {formatearFechaCotizacion(cotizacion.creado_en)}
        </span>
        {cotizacion.precio_cotizado_eur !== null ? (
          <span className="kanban__tarjeta-precio">
            {formatearEuro(cotizacion.precio_cotizado_eur)}
          </span>
        ) : (
          <span className="kanban__tarjeta-precio kanban__tarjeta-precio--pendiente">
            Pendiente
          </span>
        )}
      </div>

      {cotizacion.valida_hasta && (
        <span className="kanban__tarjeta-validez">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          Válida hasta {formatearFechaValidez(cotizacion.valida_hasta)}
        </span>
      )}
    </article>
  );
}

/* ─── Componente Principal ─── */
export default function MisSolicitudes() {
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [destinos, setDestinos] = useState<DestinoCatalogo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);

  const [destinoId, setDestinoId] = useState<number | ''>('');
  const [requisitos, setRequisitos] = useState('');
  const [resumenes, setResumenes] = useState<Record<number, ResumenLineasCotizacion>>({});

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [lista, destinosCatalogo] = await Promise.all([
        obtenerCotizaciones({ pagina: 1, limite: LIMITE_PAGINA_MAX }),
        obtenerDestinosCatalogo(),
      ]);
      setCotizaciones(lista.items);
      setDestinos(destinosCatalogo);

      const cotizacionesConDesglose = lista.items.filter((c) =>
        c.estado === 'pendiente' || c.estado === 'aceptada',
      );
      const resumenesMap: Record<number, ResumenLineasCotizacion> = {};
      await Promise.all(
        cotizacionesConDesglose.map(async (c) => {
          try {
            const resumen = await obtenerResumenLineasCotizacion(c.id);
            if (resumen.por_categoria.length > 0) {
              resumenesMap[c.id] = resumen;
            }
          } catch {
            /* sin líneas aún */
          }
        }),
      );
      setResumenes(resumenesMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las solicitudes');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    let activo = true;
    Promise.resolve().then(() => {
      if (activo) cargarDatos();
    });
    return () => {
      activo = false;
    };
  }, [cargarDatos]);

  const formularioValido = destinoId !== '' && requisitos.trim().length > 10;

  const abrirModal = () => setModalAbierto(true);
  const cerrarModal = () => {
    setModalAbierto(false);
    setDestinoId('');
    setRequisitos('');
  };

  const enviarSolicitud = async () => {
    if (!formularioValido) return;
    setEnviando(true);
    setError(null);
    try {
      await crearCotizacion({
        destino_id: Number(destinoId),
        requisitos: requisitos.trim(),
        estado: 'solicitada',
      });
      await cargarDatos();
      cerrarModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar la solicitud');
    } finally {
      setEnviando(false);
    }
  };

  // Agrupar cotizaciones por columna
  const cotizacionesPorColumna = (estados: EstadoCotizacion[]): Cotizacion[] => {
    return cotizaciones.filter((c) => estados.includes(c.estado));
  };

  const tieneCotizaciones = cotizaciones.length > 0;

  return (
    <div className="mis-solicitudes">
      {error && <div className="mis-solicitudes__error" role="alert">{error}</div>}
      {/* Cabecera */}
      <div className="mis-solicitudes__header">
        <div>
          <h1 className="mis-solicitudes__titulo">Mis solicitudes</h1>
          <p className="mis-solicitudes__subtitulo">
            Solicita cotizaciones personalizadas para tu próximo viaje.
          </p>
        </div>
        <button onClick={abrirModal} className="mis-solicitudes__btn-nueva">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Nueva solicitud
        </button>
      </div>

      {/* Contenido: vacío o Kanban */}
      {!cargando && !tieneCotizaciones ? (
        <div className="mis-solicitudes__vacio">
          <span className="mis-solicitudes__vacio-icono">📋</span>
          <h3 className="mis-solicitudes__vacio-titulo">Sin solicitudes aún</h3>
          <p className="mis-solicitudes__vacio-desc">
            ¿Tienes un viaje en mente? Solicita una cotización personalizada y nuestro equipo te responderá pronto.
          </p>
          <button onClick={abrirModal} className="mis-solicitudes__vacio-btn">
            Crear mi primera solicitud
          </button>
        </div>
      ) : cargando ? (
        <p className="mis-solicitudes__cargando">Cargando solicitudes...</p>
      ) : (
        <div className="kanban">
          {COLUMNAS.map((columna) => {
            const items = cotizacionesPorColumna(columna.estados);
            return (
              <div key={columna.id} className="kanban__columna">
                <div className="kanban__columna-header">
                  <div className="kanban__columna-titulo-wrap">
                    <span className={`kanban__columna-indicador ${columna.indicadorClase}`} />
                    <span className="kanban__columna-titulo">{columna.titulo}</span>
                  </div>
                  <span className="kanban__columna-conteo">{items.length}</span>
                </div>

                <div className="kanban__columna-body">
                  {items.length === 0 ? (
                    <div className="kanban__columna-vacia">
                      <span className="kanban__columna-vacia-icono">{columna.vacioIcono}</span>
                      <span className="kanban__columna-vacia-texto">{columna.vacioTexto}</span>
                    </div>
                  ) : (
                    items.map((cotizacion) => (
                      <TarjetaCotizacion
                        key={cotizacion.id}
                        cotizacion={cotizacion}
                        resumen={resumenes[cotizacion.id]}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Nueva Cotización */}
      {modalAbierto && (
        <div className="modal-cotizacion" onClick={cerrarModal}>
          <div className="modal-cotizacion__card" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="modal-cotizacion__header">
              <div className="modal-cotizacion__header-text">
                <span className="modal-cotizacion__tag">Nueva solicitud</span>
                <h2 className="modal-cotizacion__title">Cotizar viaje</h2>
                <p className="modal-cotizacion__subtitle">
                  Cuéntanos a dónde quieres ir y qué necesitas. Te responderemos pronto.
                </p>
              </div>
              <button className="modal-cotizacion__cerrar" onClick={cerrarModal} aria-label="Cerrar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="modal-cotizacion__body">
              {/* Destino */}
              <div className="modal-cotizacion__field">
                <label className="modal-cotizacion__label" htmlFor="cot-destino">Destino</label>
                <select
                  id="cot-destino"
                  className="modal-cotizacion__select"
                  value={destinoId === '' ? '' : destinoId}
                  onChange={(e) => setDestinoId(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">Selecciona un destino</option>
                  {destinos.map((d) => (
                    <option key={d.id} value={d.id}>{d.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Requisitos */}
              <div className="modal-cotizacion__field">
                <label className="modal-cotizacion__label" htmlFor="cot-requisitos">Requisitos del viaje</label>
                <textarea
                  id="cot-requisitos"
                  className="modal-cotizacion__textarea"
                  placeholder="Describe qué tipo de experiencia buscas, cuántos viajeros serían, preferencias especiales…"
                  value={requisitos}
                  onChange={(e) => setRequisitos(e.target.value)}
                  maxLength={1000}
                />
                <span className="modal-cotizacion__hint">
                  Incluye toda la información relevante: fechas tentativas, cantidad de personas, necesidades especiales, etc.
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="modal-cotizacion__footer">
              <button className="modal-cotizacion__btn-cancelar" onClick={cerrarModal}>
                Cancelar
              </button>
              <button
                className="modal-cotizacion__btn-enviar"
                disabled={!formularioValido || enviando}
                onClick={enviarSolicitud}
              >
                {enviando ? 'Enviando…' : 'Enviar solicitud'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
