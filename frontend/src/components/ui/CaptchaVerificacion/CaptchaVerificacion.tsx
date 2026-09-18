import './CaptchaVerificacion.css';

interface Props {
  pregunta: string;
  imagen?: string;
  respuesta: string;
  onRespuesta: (valor: string) => void;
  onRefrescar: () => void;
  cargando?: boolean;
}

export default function CaptchaVerificacion({
  pregunta,
  imagen,
  respuesta,
  onRespuesta,
  onRefrescar,
  cargando = false,
}: Props) {
  return (
    <div className="captcha-verificacion">
      <p className="captcha-verificacion__etiqueta">Verificación CAPTCHA</p>
      <div className="captcha-verificacion__fila">
        {imagen ? (
          <img
            className="captcha-verificacion__imagen"
            src={imagen}
            alt="CAPTCHA: escribe los caracteres que ves"
          />
        ) : (
          <span className="captcha-verificacion__pregunta">{pregunta || 'Cargando…'}</span>
        )}
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
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        required
        maxLength={6}
        placeholder="Escribe los caracteres de la imagen"
        value={respuesta}
        onChange={(e) => onRespuesta(e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase())}
        aria-label="Caracteres del CAPTCHA"
      />
    </div>
  );
}
