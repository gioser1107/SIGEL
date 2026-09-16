import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CabeceraModulo } from '../../../components/admin';
import { detectarMes, rangoMesHistorico, type ContextoAsistente } from '../../../asistente/datosAsistente';
import { responderPregunta, sugerenciasAsistente } from '../../../asistente/motorRespuestas';
import { SALUDO } from '../../../asistente/conocimiento';
import type { MensajeAsistente } from '../../../asistente/tipos';
import { obtenerReporteEstadistico } from '../../../services/reportesEstadisticos';
import type { ReporteEstadistico } from '../../../types/reportesEstadisticos';
import { fechaHoyIso } from '../../../utils/validacionesFormulario';
import '../../../asistente/AsistenteFlotante.css';
import './AsistenteInteligente.css';

function idMensaje() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function AsistenteInteligente() {
  const [texto, setTexto] = useState('');
  const [mensajes, setMensajes] = useState<MensajeAsistente[]>([
    { id: 'saludo', rol: 'asistente', texto: SALUDO.admin },
  ]);
  const [reporteAnio, setReporteAnio] = useState<ReporteEstadistico | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    const hasta = fechaHoyIso();
    const desde = `${new Date().getFullYear()}-01-01`;
    obtenerReporteEstadistico(desde, hasta).then(setReporteAnio).catch(() => setReporteAnio(null));
  }, []);

  async function enviar(pregunta: string) {
    const limpia = pregunta.trim();
    if (!limpia || cargando) return;
    setCargando(true);
    setMensajes((prev) => [...prev, { id: idMensaje(), rol: 'usuario', texto: limpia }]);
    setTexto('');
    try {
      const mes = detectarMes(limpia);
      const ctx: ContextoAsistente = { reporteAnio };
      if (mes) {
        const rango = rangoMesHistorico(mes.numero);
        ctx.mesConsultado = { ...mes, anio: rango.anio };
        try {
          ctx.reporteMes = await obtenerReporteEstadistico(rango.desde, rango.hasta);
        } catch {
          ctx.reporteMes = null;
        }
      }
      const respuesta = responderPregunta(limpia, 'admin', ctx);
      setMensajes((prev) => [
        ...prev,
        { id: idMensaje(), rol: 'asistente', texto: respuesta.texto, enlaces: respuesta.enlaces },
      ]);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="asistente-modulo">
      <CabeceraModulo
        migaja="SIGEL / Componente inteligente"
        titulo="Asistente SIGEL"
        descripcion="Agente de decisión: reportes, números y recomendaciones. El manual de uso está en Ayuda."
      />

      <section className="asistente-card asistente-card--chat">
        <h2>Pregúntale al agente</h2>
        <div className="asistente-modulo__mensajes">
          {mensajes.map((m) => (
            <div key={m.id} className={`asistente-msg asistente-msg--${m.rol}`}>
              <p>{m.texto}</p>
              {m.enlaces?.map((e) => (
                <Link key={e.to} to={e.to}>{e.etiqueta}</Link>
              ))}
            </div>
          ))}
        </div>
        <div className="asistente-flotante__chips">
          {sugerenciasAsistente('admin').map((s) => (
            <button key={s} type="button" onClick={() => void enviar(s)}>{s}</button>
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
            placeholder="Ej. ¿Qué destino conviene sacar en diciembre?"
            maxLength={240}
            disabled={cargando}
          />
          <button type="submit" disabled={cargando}>{cargando ? '…' : 'Enviar'}</button>
        </form>
      </section>
    </div>
  );
}
