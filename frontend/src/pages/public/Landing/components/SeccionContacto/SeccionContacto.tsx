import { URL_INSTAGRAM, URL_WHATSAPP } from '../../../../../config/contacto';
import './SeccionContacto.css';

export default function SeccionContacto() {
  return (
    <section className="seccion-contacto" id="contacto">
      <span className="seccion-contacto__eyebrow">Contacto</span>
      <h2 className="seccion-contacto__titulo">Contáctanos</h2>
      <p className="seccion-contacto__texto">
        Escríbenos por WhatsApp o síguenos en Instagram. Te ayudamos a armar tu próximo viaje.
      </p>
      <a
        href={URL_WHATSAPP}
        className="seccion-contacto__boton"
        target="_blank"
        rel="noopener noreferrer"
      >
        Contáctanos
      </a>
      <a
        href={URL_INSTAGRAM}
        className="seccion-contacto__instagram"
        target="_blank"
        rel="noopener noreferrer"
      >
        @travelbqtoc.a
      </a>
    </section>
  );
}
