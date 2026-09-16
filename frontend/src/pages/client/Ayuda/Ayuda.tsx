import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GUIAS, PREGUNTAS_FRECUENTES } from '../../../asistente/conocimiento';
import '../../admin/AsistenteInteligente/AsistenteInteligente.css';

export default function AyudaCliente() {
  const [faqAbierta, setFaqAbierta] = useState<string | null>(null);
  const faqs = PREGUNTAS_FRECUENTES.filter((f) => f.audiencias.includes('cliente'));
  const guia = GUIAS.find((g) => g.id === 'guia-portal');

  return (
    <div className="asistente-modulo">
      <header>
        <p className="asistente-card__nota">Centro de ayuda</p>
        <h1>Cómo usar TravelBqto</h1>
        <p>Guías y preguntas frecuentes. Si quieres una recomendación o una cifra, usa el botón Asistente.</p>
      </header>

      {guia && (
        <section className="asistente-card">
          <h2>{guia.titulo}</h2>
          <ol className="asistente-pasos">
            {guia.pasos.map((paso, i) => (
              <li key={paso.titulo}>
                <strong>{i + 1}. {paso.titulo}</strong>
                <p>{paso.detalle}</p>
                {paso.to && <Link to={paso.to}>Ir</Link>}
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="asistente-card">
        <h2>Preguntas frecuentes</h2>
        <ul className="asistente-faq">
          {faqs.map((f) => (
            <li key={f.id}>
              <button type="button" onClick={() => setFaqAbierta((id) => (id === f.id ? null : f.id))}>
                {f.pregunta}
              </button>
              {faqAbierta === f.id && (
                <p className="asistente-card__nota" style={{ padding: '0.4rem 0.2rem 0.8rem' }}>
                  {f.respuesta}
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
