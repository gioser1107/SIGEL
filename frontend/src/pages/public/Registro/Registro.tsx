import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PuntosRecogidaEditor from '../../../components/puntos-recogida/PuntosRecogidaEditor';
import { draftAPayloadPuntos } from '../../../components/puntos-recogida/utils';
import '../../../components/puntos-recogida/puntos-recogida.css';
import Boton from '../../../components/ui/Boton/Boton';
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

const TIPOS_DOCUMENTO = ['V', 'E', 'J', 'P'] as const;

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
  const [tipoDocumento, setTipoDocumento] = useState('V');
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [telefono, setTelefono] = useState('');

  const [estados, setEstados] = useState<{ id: number; nombre: string }[]>([]);
  const [ciudades, setCiudades] = useState<{ id: number; nombre: string }[]>([]);
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
    if (telefono && /[A-Za-z]/.test(telefono)) return 'El teléfono no puede contener letras.';
    return null;
  }

  async function registrar() {
    setError('');

    const err1 = validarPaso1();
    if (err1) {
      setError(err1);
      setPaso(1);
      return;
    }

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
        telefono: telefono.trim() || undefined,
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

  return (
    <div className="registro-page inicio-sesion">
      <div className="inicio-sesion__contenedor registro-page__contenedor">
        <div className="inicio-sesion__bloque-formulario">
          <div className="inicio-sesion__header">
            <Link to="/" className="inicio-sesion__logo">
              <span className="inicio-sesion__logo-icon">✈</span>
              <span className="inicio-sesion__logo-text">Travel<span>Bqto</span></span>
            </Link>
            <h1 className="inicio-sesion__title">Crear cuenta</h1>
            <p className="inicio-sesion__subtitle">Paso {paso} de 3 — Registro en el portal de clientes</p>
          </div>

          <div className="registro-page__stepper">
            {['Datos personales', 'Ubicación', 'Puntos de recogida'].map((label, i) => (
              <span
                key={label}
                className={`registro-page__paso${paso === i + 1 ? ' registro-page__paso--activo' : ''}${paso > i + 1 ? ' registro-page__paso--ok' : ''}`}
              >
                {i + 1}. {label}
              </span>
            ))}
          </div>

          {error && <div className="inicio-sesion__error" role="alert">{error}</div>}

          {paso <= 2 ? (
            <form className="inicio-sesion__form" onSubmit={(e) => e.preventDefault()}>
              {paso === 1 && (
                <>
                  <Entrada etiqueta="Nombre" value={nombre} onChange={(e) => setNombre(sanitizarNombrePersona(e.target.value))} maxLength={80} required />
                  <Entrada etiqueta="Apellido" value={apellido} onChange={(e) => setApellido(sanitizarNombrePersona(e.target.value))} maxLength={80} required />
                  <Entrada etiqueta="Correo" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} required />
                  <Entrada etiqueta="Contraseña" type="password" value={contrasena} onChange={(e) => setContrasena(e.target.value)} required />
                  <Entrada etiqueta="Confirmar contraseña" type="password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} required />
                  <div className="grupo-entrada">
                    <label className="grupo-entrada__etiqueta">Tipo documento</label>
                    <select className="grupo-entrada__campo" value={tipoDocumento} onChange={(e) => setTipoDocumento(e.target.value)}>
                      {TIPOS_DOCUMENTO.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <Entrada etiqueta="Número documento" value={numeroDocumento} onChange={(e) => setNumeroDocumento(sanitizarSoloDigitos(e.target.value, 15))} required />
                  <Entrada etiqueta="Teléfono" type="tel" inputMode="numeric" value={telefono} onChange={(e) => setTelefono(sanitizarSoloDigitos(e.target.value, 11))} />
                </>
              )}

              {paso === 2 && (
                <>
                  <div className="grupo-entrada">
                    <label className="grupo-entrada__etiqueta">Estado</label>
                    <select
                      className="grupo-entrada__campo"
                      value={estadoId}
                      onChange={(e) => {
                        setEstadoId(e.target.value);
                        setCiudadId('');
                        cargarCiudades(e.target.value);
                      }}
                    >
                      <option value="">Selecciona estado</option>
                      {estados.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                    </select>
                  </div>
                  <div className="grupo-entrada">
                    <label className="grupo-entrada__etiqueta">Ciudad</label>
                    <select className="grupo-entrada__campo" value={ciudadId} onChange={(e) => setCiudadId(e.target.value)} disabled={!estadoId}>
                      <option value="">Selecciona ciudad</option>
                      {ciudades.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>
                </>
              )}

              <div className="registro-page__acciones">
                {paso > 1 && (
                  <Boton type="button" variante="secundario" onClick={() => setPaso((p) => p - 1)}>
                    Atrás
                  </Boton>
                )}
                <Boton
                  type="button"
                  variante="primario"
                  onClick={() => {
                    if (paso === 1) {
                      const err = validarPaso1();
                      if (err) { setError(err); return; }
                    }
                    setError('');
                    setPaso((p) => p + 1);
                  }}
                >
                  Siguiente
                </Boton>
              </div>
            </form>
          ) : (
            <>
              <PuntosRecogidaEditor
                mode="register"
                value={puntosDraft}
                onChange={setPuntosDraft}
                onError={setError}
              />

              <div className="registro-page__acciones">
                <Boton type="button" variante="secundario" onClick={() => setPaso(2)}>
                  Atrás
                </Boton>
                <Boton type="button" variante="secundario" onClick={() => void registrar()} disabled={cargando}>
                  Omitir y registrarme
                </Boton>
                <Boton type="button" variante="primario" onClick={() => void registrar()} disabled={cargando}>
                  {cargando ? 'Registrando…' : 'Crear cuenta'}
                </Boton>
              </div>
            </>
          )}

          <p className="inicio-sesion__toggle">
            ¿Ya tienes cuenta? <Link to="/iniciar-sesion">Inicia sesión</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
