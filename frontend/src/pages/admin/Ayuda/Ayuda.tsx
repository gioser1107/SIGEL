import { Link } from 'react-router-dom';
import { CabeceraModulo } from '../../../components/admin';
import { GUIAS, PREGUNTAS_FRECUENTES } from '../../../asistente/conocimiento';
import type { AudienciaAsistente } from '../../../asistente/tipos';
import { iniciarRecorridoAdmin } from '../../../ayuda/recorridoAdmin';
import { useState } from 'react';
import '../AsistenteInteligente/AsistenteInteligente.css';

interface Props {
  audiencia?: AudienciaAsistente;
}

export default function AyudaAdmin({ audiencia = 'admin' }: Props) {
  const [faqAbierta, setFaqAbierta] = useState<string | null>(PREGUNTAS_FRECUENTES[0]?.id ?? null);
  const [guiaId, setGuiaId] = useState(GUIAS.find((g) => g.audiencias.includes(audiencia))?.id ?? '');
  const faqs = PREGUNTAS_FRECUENTES.filter((f) => f.audiencias.includes(audiencia));
  const guias = GUIAS.filter((g) => g.audiencias.includes(audiencia));
  const guia = guias.find((g) => g.id === guiaId) ?? guias[0];

  return (
    <div className="asistente-modulo">
      <CabeceraModulo
        migaja="SIGEL / Ayuda"
        titulo="Centro de ayuda"
        descripcion="Manual de uso: preguntas frecuentes y guías paso a paso. Las cifras y recomendaciones van en el Asistente."
        acciones={
          <button type="button" className="asistente-recorrido-btn" onClick={() => iniciarRecorridoAdmin()}>
            Iniciar recorrido
          </button>
        }
      />

      <div className="asistente-modulo__grid">
        <section className="asistente-card">
          <h2>Guía interactiva</h2>
          <p className="asistente-card__nota">
            El recorrido señala el menú real de SIGEL, paso a paso. También puedes lanzarlo con el botón de arriba.
          </p>
          <div className="asistente-guias">
            {guias.map((g) => (
              <button
                key={g.id}
                type="button"
                className={g.id === guia?.id ? 'is-activa' : ''}
                onClick={() => setGuiaId(g.id)}
              >
                {g.titulo}
              </button>
            ))}
          </div>
          {guia && (
            <ol className="asistente-pasos">
              {guia.pasos.map((paso, i) => (
                <li key={paso.titulo}>
                  <strong>{i + 1}. {paso.titulo}</strong>
                  <p>{paso.detalle}</p>
                  {paso.to && <Link to={paso.to}>Ir al módulo</Link>}
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="asistente-card">
          <h2>Preguntas frecuentes</h2>
          <ul className="asistente-faq">
            {faqs.map((f) => (
              <li key={f.id}>
                <button type="button" onClick={() => setFaqAbierta(f.id)}>
                  {f.pregunta}
                </button>
                {faqAbierta === f.id && (
                  <p className="asistente-card__nota" style={{ padding: '0.4rem 0.2rem 0.8rem' }}>
                    {f.respuesta}
                    {f.enlaces?.map((e) => (
                      <span key={e.to}> · <Link to={e.to}>{e.etiqueta}</Link></span>
                    ))}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
