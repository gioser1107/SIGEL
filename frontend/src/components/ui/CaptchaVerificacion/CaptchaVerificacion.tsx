import './CaptchaVerificacion.css';

interface Props {
  pregunta: string;
  respuesta: string;
  onRespuesta: (valor: string) => void;
  onRefrescar: () => void;
  cargando?: boolean;
}

export default function CaptchaVerificacion({
  pregunta,
  respuesta,
  onRespuesta,
  onRefrescar,
  cargando = false,
}: Props) {
  return (
    <div className="captcha-verificacion">
      <p className="captcha-verificacion__etiqueta">Verificación CAPTCHA</p>
      <div className="captcha-verificacion__fila">
        <span className="captcha-verificacion__pregunta">{pregunta || 'Cargando…'}</span>
        <button
          type="button"
          className="captcha-verificacion__otra"
          onClick={onRefrescar}
          disabled={cargando}
        >
          Otra
        </button>
      </div>
      <input
        className="captcha-verificacion__campo"
        type="text"
        inputMode="numeric"
        autoComplete="off"
        required
        placeholder="Escribe el resultado"
        value={respuesta}
        onChange={(e) => onRespuesta(e.target.value.replace(/[^\d-]/g, ''))}
        aria-label="Respuesta del CAPTCHA"
      />
    </div>
  );
}
