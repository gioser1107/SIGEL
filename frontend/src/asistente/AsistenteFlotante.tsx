import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { SALUDO } from './conocimiento';
import { detectarMes, rangoMesHistorico, type ContextoAsistente } from './datosAsistente';
import { responderPregunta, sugerenciasAsistente } from './motorRespuestas';
import { obtenerReporteEstadistico } from '../services/reportesEstadisticos';
import type { ReporteEstadistico } from '../types/reportesEstadisticos';
import { fechaHoyIso } from '../utils/validacionesFormulario';
import type { AudienciaAsistente, MensajeAsistente } from './tipos';
import './AsistenteFlotante.css';

interface Props {
  audiencia: AudienciaAsistente;
  enlaceModulo?: string;
  dataRecorrido?: string;
}

function idMensaje() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function AsistenteFlotante({ audiencia, enlaceModulo, dataRecorrido }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState('');
  const [cargando, setCargando] = useState(false);
  const [reporteAnio, setReporteAnio] = useState<ReporteEstadistico | null>(null);
  const reporteCargado = useRef(false);
  const [mensajes, setMensajes] = useState<MensajeAsistente[]>(() => [
    { id: 'saludo', rol: 'asistente', texto: SALUDO[audiencia] },
  ]);
  const listaRef = useRef<HTMLDivElement>(null);
  const [ocultoPorCapa, setOcultoPorCapa] = useState(false);

  useEffect(() => {
    function abrir() {
      setAbierto(true);
    }
    window.addEventListener('sigel:abrir-asistente', abrir);
    return () => window.removeEventListener('sigel:abrir-asistente', abrir);
  }, []);

  useEffect(() => {
    if (audiencia !== 'admin' || reporteCargado.current) return;
    reporteCargado.current = true;
    const hasta = fechaHoyIso();
    const desde = `${new Date().getFullYear()}-01-01`;
    obtenerReporteEstadistico(desde, hasta).then(setReporteAnio).catch(() => setReporteAnio(null));
  }, [audiencia]);

  useEffect(() => {
    listaRef.current?.scrollTo({ top: listaRef.current.scrollHeight, behavior: 'smooth' });
  }, [mensajes, abierto]);

  useEffect(() => {
    function hayCapaEncima() {
      return Boolean(
        document.querySelector('.panel-deslizable--abierto') ||
        document.querySelector('.panel-deslizable__superposicion--visible') ||
        document.querySelector('[class*="modal"][class*="superposicion"]') ||
        document.querySelector('.driver-active')
      );
    }

    function actualizar() {
      const tapado = hayCapaEncima();
      setOcultoPorCapa(tapado);
      if (tapado) setAbierto(false);
    }

    actualizar();
    const observer = new MutationObserver(actualizar);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  async function enviar(pregunta: string) {
    const limpia = pregunta.trim();
    if (!limpia || cargando) return;
    setCargando(true);
    setMensajes((prev) => [...prev, { id: idMensaje(), rol: 'usuario', texto: limpia }]);
    setTexto('');
    try {
      const ctx: ContextoAsistente = { reporteAnio };
      const mes = detectarMes(limpia);
      if (audiencia === 'admin' && mes) {
        const rango = rangoMesHistorico(mes.numero);
        ctx.mesConsultado = { ...mes, anio: rango.anio };
        try {
          ctx.reporteMes = await obtenerReporteEstadistico(rango.desde, rango.hasta);
        } catch {
          ctx.reporteMes = null;
        }
      }
      const respuesta = responderPregunta(limpia, audiencia, ctx);
      setMensajes((prev) => [
        ...prev,
        { id: idMensaje(), rol: 'asistente', texto: respuesta.texto, enlaces: respuesta.enlaces },
      ]);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div
      className={`asistente-flotante asistente-flotante--${audiencia}${ocultoPorCapa ? ' asistente-flotante--oculto' : ''}`}
      data-recorrido={dataRecorrido}
      aria-hidden={ocultoPorCapa || undefined}
    >
      {abierto && (
        <div className="asistente-flotante__panel" role="dialog" aria-label="Asistente SIGEL">
          <header className="asistente-flotante__cabecera">
            <div>
              <p className="asistente-flotante__kicker">Componente inteligente</p>
              <h2>Asistente SIGEL</h2>
            </div>
            <button type="button" className="asistente-flotante__cerrar" onClick={() => setAbierto(false)} aria-label="Cerrar asistente">
              ×
            </button>
          </header>

          <div className="asistente-flotante__mensajes" ref={listaRef}>
            {mensajes.map((m) => (
              <div key={m.id} className={`asistente-msg asistente-msg--${m.rol}`}>
                <p>{m.texto}</p>
                {m.enlaces && m.enlaces.length > 0 && (
                  <div className="asistente-msg__enlaces">
                    {m.enlaces.map((e) => (
                      <Link key={e.to} to={e.to} onClick={() => setAbierto(false)}>
                        {e.etiqueta}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="asistente-flotante__chips">
            {sugerenciasAsistente(audiencia).map((s) => (
              <button key={s} type="button" onClick={() => void enviar(s)}>
                {s}
              </button>
            ))}
          </div>

          <form
            className="asistente-flotante__form"
            onSubmit={(e) => {
              e.preventDefault();
              void enviar(texto);
            }}
          >
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={audiencia === 'admin' ? 'Ej. ¿Qué destino conviene en diciembre?' : 'Escribe tu pregunta…'}
              aria-label="Pregunta al asistente"
              maxLength={240}
              disabled={cargando}
            />
            <button type="submit" disabled={cargando}>{cargando ? '…' : 'Enviar'}</button>
          </form>

          {enlaceModulo && (
            <Link className="asistente-flotante__modulo" to={enlaceModulo} onClick={() => setAbierto(false)}>
              Abrir módulo del asistente
            </Link>
          )}
        </div>
      )}

      <button
        type="button"
        className="asistente-flotante__boton"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-label="Abrir asistente inteligente"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M12 8V4H8" />
          <rect x="4" y="8" width="16" height="12" rx="2" />
          <path d="M2 14h2" />
          <path d="M20 14h2" />
          <path d="M15 13v2" />
          <path d="M9 13v2" />
        </svg>
        <span>Asistente</span>
      </button>
    </div>
  );
}
