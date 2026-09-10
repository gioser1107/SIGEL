import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PuntosRecogidaEditor from '../../../components/puntos-recogida/PuntosRecogidaEditor';
import { draftAPayloadPuntos } from '../../../components/puntos-recogida/utils';
import '../../../components/puntos-recogida/puntos-recogida.css';
import Boton from '../../../components/ui/Boton/Boton';
import LogoMarca from '../../../components/ui/LogoMarca/LogoMarca';
import Entrada from '../../../components/ui/Entrada/Entrada';
import { useAutenticacionContext } from '../../../context/Autenticacion';
import { useReservas } from '../../../context/Reservas';
import { registrarCliente } from '../../../services/autenticacion';
import { listarCiudadesPorEstado, listarEstados } from '../../../services/ubicaciones';
import { ErrorApi } from '../../../services/api';
import {
  MENSAJE_NOMBRE_PERSONA,
  esNombreValido,
  sanitizarNombrePersona,
  sanitizarSoloDigitos,
} from '../../../utils/validacionesFormulario';
import type { PuntosRecogidaDraft } from '../../../types/puntoRecogida';
import { PUNTOS_RECOGIDA_DRAFT_VACIO } from '../../../types/puntoRecogida';
import '../InicioSesion/InicioSesion.css';
import './Registro.css';

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

const PASOS = [
  { id: 1, titulo: 'Tus datos', hint: 'Identidad y acceso' },
  { id: 2, titulo: 'Ubicación', hint: 'Dirección y ciudad' },
  { id: 3, titulo: 'Recogida', hint: 'Domicilio opcional' },
] as const;

function IconoOjo({ visible }: { visible: boolean }) {
  if (visible) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.45 0 0 1-2.16 3.19" />
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
}: CampoContrasenaProps) {
  return (
    <div className="grupo-entrada campo-contrasena inicio-sesion__input-group">
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

export default function Registro() {
  const navegar = useNavigate();
  const { establecerSesionTrasRegistro } = useAutenticacionContext();
  const { viajePendiente } = useReservas();

  const [paso, setPaso] = useState(1);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
  const [tipoDocumento, setTipoDocumento] = useState('V');
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [prefijoTelefono, setPrefijoTelefono] = useState('0414');
  const [numeroTelefono, setNumeroTelefono] = useState('');

  const [estados, setEstados] = useState<{ id: number; nombre: string }[]>([]);
  const [ciudades, setCiudades] = useState<{ id: number; nombre: string }[]>([]);
  const [direccion, setDireccion] = useState('');
  const [estadoId, setEstadoId] = useState('');
  const [ciudadId, setCiudadId] = useState('');

  const [puntosDraft, setPuntosDraft] = useState<PuntosRecogidaDraft>(PUNTOS_RECOGIDA_DRAFT_VACIO);

  useEffect(() => {
    listarEstados().then(setEstados).catch(() => undefined);
  }, []);

  async function cargarCiudades(id: string) {
    if (!id) {
      setCiudades([]);
      return;
    }
    const res = await listarCiudadesPorEstado(Number(id));
    setCiudades(res.ciudades);
  }

  function validarPaso1(): string | null {
    if (!nombre.trim() || !apellido.trim()) return 'Completa nombre y apellido.';
    if (!esNombreValido(nombre) || !esNombreValido(apellido)) return MENSAJE_NOMBRE_PERSONA;
    if (!correo.trim()) return 'Ingresa tu correo.';
    if (contrasena.length < 6) return 'La contraseña debe tener al menos 6 caracteres.';
    if (contrasena !== confirmar) return 'Las contraseñas no coinciden.';
    if (!numeroDocumento.trim()) return 'Ingresa tu documento.';
    return null;
  }

  function irAlPaso(siguiente: number) {
    if (siguiente > 1) {
      const err = validarPaso1();
      if (err) {
        setError(err);
        setPaso(1);
        return;
      }
    }
    setError('');
    setPaso(siguiente);
  }

  async function registrar() {
    setError('');

    const err1 = validarPaso1();
    if (err1) {
      setError(err1);
      setPaso(1);
      return;
    }

    const telefonoCompleto = numeroTelefono.trim()
      ? `${prefijoTelefono}${numeroTelefono.trim()}`
      : '';

    setCargando(true);
    try {
      const puntosPayload = draftAPayloadPuntos(puntosDraft);
      const { usuario } = await registrarCliente({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        correo: correo.trim(),
        contrasena,
        tipo_documento: tipoDocumento,
        numero_documento: numeroDocumento.trim(),
        telefono: telefonoCompleto || undefined,
        direccion: direccion.trim() || undefined,
        estado_id: estadoId ? Number(estadoId) : undefined,
        ciudad_id: ciudadId ? Number(ciudadId) : undefined,
        ...puntosPayload,
      });
      establecerSesionTrasRegistro(usuario);
      navegar(viajePendiente ? '/client/registrar-pago' : '/client/puntos-recogida');
    } catch (err) {
      setError(err instanceof ErrorApi || err instanceof Error ? err.message : 'Error al registrarse.');
    } finally {
      setCargando(false);
    }
  }

  function alEnviarPaso(e: FormEvent) {
    e.preventDefault();
    if (paso === 1) irAlPaso(2);
    else if (paso === 2) irAlPaso(3);
  }

  const subtitulo = PASOS[paso - 1]?.hint ?? 'Registro en el portal de clientes';

  return (
    <div className="inicio-sesion registro-page">
      <div className="inicio-sesion__contenedor registro-page__contenedor">
        <div className="inicio-sesion__bloque-formulario">
          <div className="inicio-sesion__header">
            <Link to="/" className="inicio-sesion__logo" aria-label="TravelBqto — inicio">
              <LogoMarca compacto />
            </Link>
            <h1 className="inicio-sesion__title">Crear cuenta</h1>
            <p className="inicio-sesion__subtitle">
              {paso === 1
                ? 'Elige un correo y una contraseña para entrar al portal.'
                : `Paso ${paso} de 3 — ${subtitulo}.`}
            </p>
          </div>

          <ol className="registro-page__stepper" aria-label="Progreso del registro">
            {PASOS.map((item, i) => {
              const estado = paso === item.id ? 'activo' : paso > item.id ? 'ok' : 'pendiente';
              return (
                <li
                  key={item.id}
                  className={`registro-page__paso registro-page__paso--${estado}`}
                  aria-current={estado === 'activo' ? 'step' : undefined}
                >
                  {i > 0 && <span className="registro-page__paso-linea" aria-hidden="true" />}
                  <span className="registro-page__paso-num">{estado === 'ok' ? '✓' : item.id}</span>
                  <span className="registro-page__paso-textos">
                    <strong>{item.titulo}</strong>
                    <span>{item.hint}</span>
                  </span>
                </li>
              );
            })}
          </ol>
          <p className="registro-page__paso-actual">
            Paso {paso} de {PASOS.length}: {PASOS[paso - 1].titulo}
          </p>

          {error && (
            <div className="inicio-sesion__error" role="alert">
              {error}
            </div>
          )}

          {paso <= 2 ? (
            <form className="inicio-sesion__form" onSubmit={alEnviarPaso}>
              {paso === 1 && (
                <>
                  <div className="registro-page__fila">
                    <Entrada
                      etiqueta="Nombre"
                      type="text"
                      placeholder="ej: María"
                      value={nombre}
                      onChange={(e) => setNombre(sanitizarNombrePersona(e.target.value))}
                      maxLength={80}
                      required
                      autoComplete="given-name"
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
                      autoComplete="family-name"
                      className="inicio-sesion__input-group"
                    />
                  </div>

                  <Entrada
                    etiqueta="Correo electrónico"
                    type="email"
                    placeholder="ej: tu@correo.com"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    required
                    autoComplete="email"
                    className="inicio-sesion__input-group"
                  />

                  <div className="registro-page__fila">
                    <CampoContrasena
                      id="registro-contrasena"
                      etiqueta="Contraseña"
                      placeholder="Mínimo 6 caracteres"
                      value={contrasena}
                      onChange={setContrasena}
                      visible={mostrarContrasena}
                      onAlternarVisibilidad={() => setMostrarContrasena((v) => !v)}
                      autoComplete="new-password"
                      required
                    />
                    <CampoContrasena
                      id="registro-confirmar"
                      etiqueta="Confirmar contraseña"
                      placeholder="Repite la contraseña"
                      value={confirmar}
                      onChange={setConfirmar}
                      visible={mostrarConfirmar}
                      onAlternarVisibilidad={() => setMostrarConfirmar((v) => !v)}
                      autoComplete="new-password"
                      required
                    />
                  </div>

                  <div className="registro-page__fila registro-page__fila--documento">
                    <div className="grupo-entrada inicio-sesion__input-group">
                      <label htmlFor="registro-tipo-doc" className="grupo-entrada__etiqueta">
                        Tipo de documento
                      </label>
                      <select
                        id="registro-tipo-doc"
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
                  </div>

                  <div className="grupo-entrada inicio-sesion__input-group">
                    <label htmlFor="registro-telefono" className="grupo-entrada__etiqueta">
                      Teléfono (opcional)
                    </label>
                    <div className="inicio-sesion__fila-telefono">
                      <select
                        id="registro-prefijo"
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
                        id="registro-telefono"
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
                </>
              )}

              {paso === 2 && (
                <div className="registro-page__ubicacion">
                  <p className="registro-page__nota">
                    Indica tu dirección y luego el estado y la ciudad. Puedes completar esto más tarde.
                  </p>
                  <Entrada
                    etiqueta="Dirección"
                    type="text"
                    placeholder="Calle, número, urbanización, edificio, piso, apto."
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    maxLength={255}
                    autoComplete="street-address"
                    className="inicio-sesion__input-group"
                  />
                  <div className="registro-page__fila">
                    <div className="grupo-entrada inicio-sesion__input-group">
                      <label htmlFor="registro-estado" className="grupo-entrada__etiqueta">
                        Estado
                      </label>
                      <select
                        id="registro-estado"
                        className="grupo-entrada__campo inicio-sesion__select"
                        value={estadoId}
                        onChange={(e) => {
                          setEstadoId(e.target.value);
                          setCiudadId('');
                          void cargarCiudades(e.target.value);
                        }}
                      >
                        <option value="">Selecciona estado</option>
                        {estados.map((estado) => (
                          <option key={estado.id} value={estado.id}>
                            {estado.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grupo-entrada inicio-sesion__input-group">
                      <label htmlFor="registro-ciudad" className="grupo-entrada__etiqueta">
                        Ciudad
                      </label>
                      <select
                        id="registro-ciudad"
                        className="grupo-entrada__campo inicio-sesion__select"
                        value={ciudadId}
                        onChange={(e) => setCiudadId(e.target.value)}
                        disabled={!estadoId}
                      >
                        <option value="">
                          {estadoId ? 'Selecciona ciudad' : 'Primero elige el estado'}
                        </option>
                        {ciudades.map((ciudad) => (
                          <option key={ciudad.id} value={ciudad.id}>
                            {ciudad.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div className="registro-page__acciones">
                {paso > 1 && (
                  <Boton type="button" variante="secundario" onClick={() => irAlPaso(paso - 1)}>
                    Atrás
                  </Boton>
                )}
                <Boton type="submit" variante="primario" anchoCompleto={paso === 1}>
                  Siguiente
                </Boton>
              </div>
            </form>
          ) : (
            <div className="registro-page__recogida">
              <p className="registro-page__nota">
                Agrega el domicilio donde la agencia puede recogerte. Si prefieres, omite este paso y
                configúralo después en tu portal.
              </p>
              <PuntosRecogidaEditor
                mode="register"
                value={puntosDraft}
                onChange={setPuntosDraft}
                onError={setError}
              />

              <div className="registro-page__acciones">
                <Boton type="button" variante="secundario" onClick={() => irAlPaso(2)} disabled={cargando}>
                  Atrás
                </Boton>
                <Boton type="button" variante="secundario" onClick={() => void registrar()} disabled={cargando}>
                  Omitir y registrarme
                </Boton>
                <Boton type="button" variante="primario" onClick={() => void registrar()} disabled={cargando}>
                  {cargando ? 'Registrando…' : 'Crear cuenta'}
                </Boton>
              </div>
            </div>
          )}

          <p className="inicio-sesion__toggle">
            ¿Ya tienes una cuenta? <Link to="/iniciar-sesion">Inicia sesión</Link>
          </p>

          <div className="inicio-sesion__back">
            <Link to="/">← Volver al inicio</Link>
          </div>
        </div>

        <div className="inicio-sesion__bloque-visual">
          <div className="inicio-sesion__visual-overlay" />
          <div className="inicio-sesion__visual-contenido">
            <div className="inicio-sesion__badge">Portal de clientes</div>
            <h2 className="inicio-sesion__visual-titulo">Tu próxima aventura empieza aquí</h2>
            <p className="inicio-sesion__visual-desc">
              Crea tu cuenta, reserva asientos y viaja con la agencia de confianza de Barquisimeto.
            </p>
            <div className="inicio-sesion__indicadores" aria-hidden="true">
              <span className={`inicio-sesion__indicador${paso === 1 ? ' activo' : ''}`} />
              <span className={`inicio-sesion__indicador${paso === 2 ? ' activo' : ''}`} />
              <span className={`inicio-sesion__indicador${paso === 3 ? ' activo' : ''}`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
