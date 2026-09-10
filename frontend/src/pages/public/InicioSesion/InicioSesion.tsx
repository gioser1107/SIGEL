import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Boton from '../../../components/ui/Boton/Boton';
import Entrada from '../../../components/ui/Entrada/Entrada';
import useAutenticacion from '../../../hooks/useAutenticacion';
import { useReservas } from '../../../context/Reservas';
import { registrarCliente } from '../../../services/autenticacion';
import { useAutenticacionContext } from '../../../context/Autenticacion';
import { ErrorApi } from '../../../services/api';
import {
  MENSAJE_NOMBRE_PERSONA,
  esCorreoValido,
  esNombreValido,
  sanitizarNombrePersona,
  sanitizarSoloDigitos,
  validarFormularioLogin,
} from '../../../utils/validacionesFormulario';
import LogoMarca from '../../../components/ui/LogoMarca/LogoMarca';
import PanelVisualAuth from './PanelVisualAuth';
import './InicioSesion.css';

const TIPOS_DOCUMENTO = [
  { valor: 'V', etiqueta: 'V — Venezolano' },
  { valor: 'E', etiqueta: 'E — Extranjero' },
  { valor: 'J', etiqueta: 'J — Jurídico' },
  { valor: 'P', etiqueta: 'P — Pasaporte' },
] as const;

const PREFIJOS_TELEFONO = [
  { valor: '0412', etiqueta: '0412' },
  { valor: '0414', etiqueta: '0414' },
  { valor: '0416', etiqueta: '0416' },
  { valor: '0424', etiqueta: '0424' },
  { valor: '0426', etiqueta: '0426' },
  { valor: '0251', etiqueta: '0251' },
  { valor: '0212', etiqueta: '0212' },
] as const;

const MAX_DIGITOS_TELEFONO = 7;

function IconoOjo({ visible }: { visible: boolean }) {
  if (visible) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

interface CampoContrasenaProps {
  id: string;
  etiqueta: string;
  value: string;
  onChange: (valor: string) => void;
  visible: boolean;
  onAlternarVisibilidad: () => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  className?: string;
}

function CampoContrasena({
  id,
  etiqueta,
  value,
  onChange,
  visible,
  onAlternarVisibilidad,
  placeholder,
  autoComplete,
  required,
  className = '',
}: CampoContrasenaProps) {
  return (
    <div className={`grupo-entrada campo-contrasena ${className}`}>
      <label htmlFor={id} className="grupo-entrada__etiqueta">
        {etiqueta}
      </label>
      <div className="campo-contrasena__contenedor">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          className="grupo-entrada__campo campo-contrasena__campo"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          required={required}
        />
        <button
          type="button"
          className="campo-contrasena__alternar"
          onClick={onAlternarVisibilidad}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          <IconoOjo visible={visible} />
        </button>
      </div>
    </div>
  );
}

function extraerMensajeError(error: unknown): string {
  if (error instanceof ErrorApi || error instanceof Error) {
    return error.message;
  }
  return 'Ocurrió un error inesperado. Intenta de nuevo.';
}

/**
 * InicioSesion — Formulario de acceso único para administradores y clientes.
 */
export default function InicioSesion() {
  const [esRegistro, setEsRegistro] = useState(false);
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState('V');
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [prefijoTelefono, setPrefijoTelefono] = useState('0414');
  const [numeroTelefono, setNumeroTelefono] = useState('');
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const navegar = useNavigate();
  const { iniciarSesion } = useAutenticacion();
  const { establecerSesionTrasRegistro } = useAutenticacionContext();
  const { viajePendiente } = useReservas();

  const limpiarCamposRegistro = () => {
    setNombre('');
    setApellido('');
    setTipoDocumento('V');
    setNumeroDocumento('');
    setPrefijoTelefono('0414');
    setNumeroTelefono('');
    setConfirmarContrasena('');
    setMostrarContrasena(false);
    setMostrarConfirmar(false);
  };

  const manejarEnvio = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (esRegistro) {
      if (!correo.trim()) {
        setError('Ingresa tu correo.');
        return;
      }
      if (!esCorreoValido(correo)) {
        setError('Ingresa un correo electrónico válido (ej: usuario@travelbqto.com).');
        return;
      }
      if (contrasena !== confirmarContrasena) {
        setError('Las contraseñas no coinciden.');
        return;
      }
      if (contrasena.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres.');
        return;
      }
      if (!nombre.trim()) {
        setError('Ingresa tu nombre.');
        return;
      }
      if (!esNombreValido(nombre) || !esNombreValido(apellido)) {
        setError(MENSAJE_NOMBRE_PERSONA);
        return;
      }
      if (!apellido.trim()) {
        setError('Ingresa tu apellido.');
        return;
      }
      if (!numeroDocumento.trim()) {
        setError('Ingresa tu número de documento.');
        return;
      }
      if (!/^\d{4,9}$/.test(numeroDocumento.trim()) && tipoDocumento !== 'J') {
        setError('La cédula debe tener entre 4 y 9 dígitos.');
        return;
      }
      if (tipoDocumento === 'J' && !/^[A-Za-z0-9]{4,15}$/.test(numeroDocumento.trim())) {
        setError('Revisa el número de documento.');
        return;
      }
      if (numeroTelefono.trim() && !/^\d{7}$/.test(numeroTelefono.trim())) {
        setError('El teléfono debe tener exactamente 7 dígitos.');
        return;
      }
      const telefonoCompleto = numeroTelefono.trim()
        ? `${prefijoTelefono}${numeroTelefono.trim()}`
        : '';

      setCargando(true);
      try {
        const { usuario } = await registrarCliente({
          nombre: nombre.trim(),
          apellido: apellido.trim(),
          correo: correo.trim(),
          contrasena,
          tipo_documento: tipoDocumento,
          numero_documento: numeroDocumento.trim(),
          ...(telefonoCompleto ? { telefono: telefonoCompleto } : {}),
        });
        establecerSesionTrasRegistro(usuario);
        navegar(viajePendiente ? '/client/registrar-pago' : '/client/dashboard');
      } catch (err) {
        setError(extraerMensajeError(err));
      } finally {
        setCargando(false);
      }
      return;
    }

    const errorLogin = validarFormularioLogin(correo, contrasena);
    if (errorLogin) {
      setError(errorLogin);
      return;
    }
    setCargando(true);
    const resultado = await iniciarSesion(correo, contrasena);
    setCargando(false);

    if (resultado.success) {
      if (resultado.esPanelAdmin) {
        navegar('/admin/dashboard');
      } else {
        navegar(viajePendiente ? '/client/registrar-pago' : '/client/dashboard');
      }
    } else {
      setError(resultado.mensaje ?? 'Credenciales incorrectas. Verifica tu correo y contraseña.');
    }
  };

  return (
    <div className="inicio-sesion">
      <div className="inicio-sesion__contenedor">
        {/* Lado Izquierdo: Formulario */}
        <div className="inicio-sesion__bloque-formulario">
          <div className="inicio-sesion__header">
            <Link to="/" className="inicio-sesion__logo" aria-label="TravelBqto — inicio">
              <LogoMarca compacto />
            </Link>
            <h1 className="inicio-sesion__title">
              {esRegistro ? 'Crear cuenta' : '¡Bienvenido!'}
            </h1>
            <p className="inicio-sesion__subtitle">
              {esRegistro
                ? 'Regístrate para planificar tus próximos viajes.'
                : 'Ingresa tus credenciales para acceder a la plataforma.'}
            </p>
          </div>

          {error && (
            <div className="inicio-sesion__error" role="alert">
              {error}
            </div>
          )}

          <form className="inicio-sesion__form" onSubmit={manejarEnvio}>
            {esRegistro && (
              <>
                <Entrada
                  etiqueta="Nombre"
                  type="text"
                  placeholder="ej: María"
                  value={nombre}
                  onChange={(e) => setNombre(sanitizarNombrePersona(e.target.value))}
                  maxLength={80}
                  required
                  className="inicio-sesion__input-group"
                />
                <Entrada
                  etiqueta="Apellido"
                  type="text"
                  placeholder="ej: Alvarado"
                  value={apellido}
                  onChange={(e) => setApellido(sanitizarNombrePersona(e.target.value))}
                  maxLength={80}
                  required
                  className="inicio-sesion__input-group"
                />
              </>
            )}

            <Entrada
              etiqueta="Correo electrónico"
              type="email"
              placeholder="ej: cliente@travelbqto.com"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              required
              autoComplete="email"
              className="inicio-sesion__input-group"
            />

            <CampoContrasena
              id="contrasena"
              etiqueta="Contraseña"
              placeholder="••••••••"
              value={contrasena}
              onChange={setContrasena}
              visible={mostrarContrasena}
              onAlternarVisibilidad={() => setMostrarContrasena((v) => !v)}
              autoComplete={esRegistro ? 'new-password' : 'current-password'}
              required
              className="inicio-sesion__input-group"
            />

            {esRegistro && (
              <>
                <div className="grupo-entrada inicio-sesion__input-group">
                  <label htmlFor="tipo-documento" className="grupo-entrada__etiqueta">
                    Tipo de documento
                  </label>
                  <select
                    id="tipo-documento"
                    className="grupo-entrada__campo inicio-sesion__select"
                    value={tipoDocumento}
                    onChange={(e) => setTipoDocumento(e.target.value)}
                    required
                  >
                    {TIPOS_DOCUMENTO.map((tipo) => (
                      <option key={tipo.valor} value={tipo.valor}>
                        {tipo.etiqueta}
                      </option>
                    ))}
                  </select>
                </div>
                <Entrada
                  etiqueta="Número de documento"
                  type="text"
                  inputMode="numeric"
                  placeholder="ej: 12345678"
                  value={numeroDocumento}
                  onChange={(e) => setNumeroDocumento(sanitizarSoloDigitos(e.target.value, 15))}
                  required
                  className="inicio-sesion__input-group"
                />
                <div className="grupo-entrada inicio-sesion__input-group">
                  <label htmlFor="numero-telefono" className="grupo-entrada__etiqueta">
                    Teléfono (opcional)
                  </label>
                  <div className="inicio-sesion__fila-telefono">
                    <select
                      id="prefijo-telefono"
                      className="grupo-entrada__campo inicio-sesion__select inicio-sesion__prefijo-telefono"
                      value={prefijoTelefono}
                      onChange={(e) => setPrefijoTelefono(e.target.value)}
                      aria-label="Prefijo telefónico"
                    >
                      {PREFIJOS_TELEFONO.map((prefijo) => (
                        <option key={prefijo.valor} value={prefijo.valor}>
                          {prefijo.etiqueta}
                        </option>
                      ))}
                    </select>
                    <input
                      id="numero-telefono"
                      type="text"
                      inputMode="numeric"
                      className="grupo-entrada__campo inicio-sesion__numero-telefono"
                      placeholder="1234567"
                      value={numeroTelefono}
                      onChange={(e) =>
                        setNumeroTelefono(sanitizarSoloDigitos(e.target.value, MAX_DIGITOS_TELEFONO))
                      }
                      autoComplete="tel-national"
                      maxLength={MAX_DIGITOS_TELEFONO}
                      aria-label="Número de teléfono"
                    />
                  </div>
                </div>
                <CampoContrasena
                  id="confirmar-contrasena"
                  etiqueta="Confirmar contraseña"
                  placeholder="••••••••"
                  value={confirmarContrasena}
                  onChange={setConfirmarContrasena}
                  visible={mostrarConfirmar}
                  onAlternarVisibilidad={() => setMostrarConfirmar((v) => !v)}
                  autoComplete="new-password"
                  required
                  className="inicio-sesion__input-group"
                />
              </>
            )}

            <Boton type="submit" variante="primario" tamano="md" anchoCompleto disabled={cargando}>
              {cargando
                ? (esRegistro ? 'Registrando...' : 'Iniciando sesión...')
                : (esRegistro ? 'Registrarse' : 'Iniciar Sesión')}
            </Boton>
          </form>

          <div className="inicio-sesion__toggle">
            {esRegistro ? (
              <p>
                ¿Ya tienes una cuenta?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setEsRegistro(false);
                    setError('');
                    limpiarCamposRegistro();
                  }}
                >
                  Inicia sesión
                </button>
              </p>
            ) : (
              <p>
                ¿No tienes cuenta?{' '}
                <Link to="/registro">Regístrate con tu documento</Link>
              </p>
            )}
          </div>

          <div className="inicio-sesion__back">
            <Link to="/">← Volver al inicio</Link>
          </div>
        </div>

        <PanelVisualAuth badge="Nuestros viajes" mostrarIndicadoresCarrusel />
      </div>
    </div>
  );
}
