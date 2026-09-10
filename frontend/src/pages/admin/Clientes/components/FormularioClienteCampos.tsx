import type { CiudadUbicacion, Cliente, EstadoUbicacion } from '../../../../types/cliente';
import {
  documentoSoloNumeros,
  sanitizarNumeroDocumento,
  type ErroresFormularioCliente,
  type FormularioCliente,
} from '../../../../utils/validacionesCliente';
import { sanitizarNombrePersona } from '../../../../utils/validacionesFormulario';
import { TIPOS_DOCUMENTO } from '../constants';
import CampoTelefono from './CampoTelefono';
import './FormularioClienteCampos.css';

interface FormularioClienteCamposProps {
  form: FormularioCliente;
  erroresForm: ErroresFormularioCliente;
  estados: EstadoUbicacion[];
  ciudades: CiudadUbicacion[];
  cargandoEstados?: boolean;
  cargandoCiudades: boolean;
  clienteActivo?: Cliente | null;
  idPrefijo?: string;
  ocultarIntro?: boolean;
  variante?: 'admin' | 'acompanante';
  onBlurDocumento?: () => void;
  onChange: (actualizador: (prev: FormularioCliente) => FormularioCliente) => void;
  onLimpiarError: (campo: keyof ErroresFormularioCliente) => void;
}

export default function FormularioClienteCampos({
  form,
  erroresForm,
  estados,
  ciudades,
  cargandoEstados = false,
  cargandoCiudades,
  clienteActivo,
  idPrefijo = 'cliente',
  ocultarIntro = false,
  variante = 'admin',
  onBlurDocumento,
  onChange,
  onLimpiarError,
}: FormularioClienteCamposProps) {
  const id = (sufijo: string) => `${idPrefijo}-${sufijo}`;
  const esAcompanante = variante === 'acompanante';

  return (
    <div className={`drawer-form${esAcompanante ? ' drawer-form--acompanante' : ''}`}>
      {!ocultarIntro && (
        <p className="drawer-form__intro">
          Solo se guarda la ficha (documento, contacto y ubicación). No se crea usuario ni se pide
          correo. Si más adelante quiere entrar al portal, se registra allí con el mismo documento:
          el sistema vincula la cuenta a esta ficha y conserva sus reservas.
        </p>
      )}

      {clienteActivo && !clienteActivo.usuario_id && !esAcompanante && (
        <div className="drawer-form__ficha">
          <div className="drawer-form__ficha-item">
            <span className="drawer-form__ficha-etiqueta">Cuenta de portal</span>
            <strong>Sin cuenta de portal</strong>
          </div>
        </div>
      )}

      <section className="fp-form-seccion">
        <h3 className="fp-form-seccion__titulo">Identificación</h3>
        <div className={`drawer-form__fila-2${esAcompanante ? ' drawer-form__fila-2--doc' : ''}`}>
          {!esAcompanante && (
            <div className="drawer-form__campo">
              <label className="drawer-form__label" htmlFor={id('tipo')}>
                Tipo de cliente <span className="drawer-form__req">*</span>
              </label>
              <select
                id={id('tipo')}
                className="drawer-form__input"
                value={form.tipo_cliente}
                onChange={(e) => {
                  const tipo = e.target.value as FormularioCliente['tipo_cliente'];
                  onChange((f) => ({
                    ...f,
                    tipo_cliente: tipo,
                    razon_social: tipo === 'natural' ? '' : f.razon_social,
                  }));
                  onLimpiarError('tipo_cliente');
                }}
              >
                <option value="natural">Persona natural</option>
                <option value="juridico">Empresa / jurídico</option>
              </select>
              {erroresForm.tipo_cliente && <p className="clientes__campo-error">{erroresForm.tipo_cliente}</p>}
            </div>
          )}
          <div className="drawer-form__campo">
            <label className="drawer-form__label" htmlFor={id('doc-tipo')}>
              Tipo de documento <span className="drawer-form__req">*</span>
            </label>
            <select
              id={id('doc-tipo')}
              className="drawer-form__input"
              value={form.tipo_documento}
              onChange={(e) => {
                const tipo = e.target.value as FormularioCliente['tipo_documento'];
                onChange((f) => ({
                  ...f,
                  tipo_documento: tipo,
                  numero_documento: sanitizarNumeroDocumento(tipo, f.numero_documento),
                }));
                onLimpiarError('tipo_documento');
              }}
            >
              {TIPOS_DOCUMENTO.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            {erroresForm.tipo_documento && <p className="clientes__campo-error">{erroresForm.tipo_documento}</p>}
          </div>
        </div>

        <div className="drawer-form__campo">
          <label className="drawer-form__label" htmlFor={id('doc-num')}>
            Número de documento <span className="drawer-form__req">*</span>
          </label>
          <input
            id={id('doc-num')}
            className="drawer-form__input"
            type="text"
            inputMode={documentoSoloNumeros(form.tipo_documento) ? 'numeric' : 'text'}
            placeholder={documentoSoloNumeros(form.tipo_documento) ? '12345678' : 'Número de documento'}
            maxLength={documentoSoloNumeros(form.tipo_documento) ? 9 : 15}
            value={form.numero_documento}
            onChange={(e) => {
              const limpio = sanitizarNumeroDocumento(form.tipo_documento, e.target.value);
              onChange((f) => ({ ...f, numero_documento: limpio }));
              onLimpiarError('numero_documento');
            }}
            onBlur={() => onBlurDocumento?.()}
            onKeyDown={(e) => {
              if (!documentoSoloNumeros(form.tipo_documento)) return;
              const permitidas = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
              if (permitidas.includes(e.key)) return;
              if (!/^\d$/.test(e.key)) e.preventDefault();
            }}
          />
          {erroresForm.numero_documento && <p className="clientes__campo-error">{erroresForm.numero_documento}</p>}
        </div>
      </section>

      <section className="fp-form-seccion">
        <h3 className="fp-form-seccion__titulo">Datos personales</h3>
        <div className="drawer-form__fila-2">
          <div className="drawer-form__campo">
            <label className="drawer-form__label" htmlFor={id('nombre')}>
              Nombre <span className="drawer-form__req">*</span>
            </label>
            <input
              id={id('nombre')}
              className="drawer-form__input"
              autoComplete="given-name"
              maxLength={80}
              value={form.nombre}
              onChange={(e) => {
                onChange((f) => ({ ...f, nombre: sanitizarNombrePersona(e.target.value) }));
                onLimpiarError('nombre');
              }}
            />
            {erroresForm.nombre && <p className="clientes__campo-error">{erroresForm.nombre}</p>}
          </div>
          <div className="drawer-form__campo">
            <label className="drawer-form__label" htmlFor={id('apellido')}>
              Apellido <span className="drawer-form__req">*</span>
            </label>
            <input
              id={id('apellido')}
              className="drawer-form__input"
              autoComplete="family-name"
              maxLength={80}
              value={form.apellido}
              onChange={(e) => {
                onChange((f) => ({ ...f, apellido: sanitizarNombrePersona(e.target.value) }));
                onLimpiarError('apellido');
              }}
            />
            {erroresForm.apellido && <p className="clientes__campo-error">{erroresForm.apellido}</p>}
          </div>
        </div>

        {form.tipo_cliente === 'juridico' && !esAcompanante && (
          <div className="drawer-form__campo">
            <label className="drawer-form__label" htmlFor={id('razon')}>
              Razón social <span className="drawer-form__req">*</span>
            </label>
            <input
              id={id('razon')}
              className="drawer-form__input"
              value={form.razon_social}
              onChange={(e) => {
                onChange((f) => ({ ...f, razon_social: e.target.value }));
                onLimpiarError('razon_social');
              }}
            />
            {erroresForm.razon_social && <p className="clientes__campo-error">{erroresForm.razon_social}</p>}
          </div>
        )}
      </section>

      <section className="fp-form-seccion">
        <h3 className="fp-form-seccion__titulo">Contacto</h3>
        <CampoTelefono
          idPrefijo={id('tel-prefijo')}
          idNumero={id('tel-numero')}
          idFijo={id('tel-fijo')}
          etiqueta="Teléfono principal"
          prefijo={form.telefono_prefijo}
          numero={form.telefono_numero}
          fijo={form.telefono_fijo}
          error={erroresForm.telefono}
          onPrefijoChange={(v) => onChange((f) => ({ ...f, telefono_prefijo: v, telefono_numero: '', telefono_fijo: '' }))}
          onNumeroChange={(v) => onChange((f) => ({ ...f, telefono_numero: v }))}
          onFijoChange={(v) => onChange((f) => ({ ...f, telefono_fijo: v }))}
          onLimpiarError={() => onLimpiarError('telefono')}
        />

        {!esAcompanante && (
          <CampoTelefono
            idPrefijo={id('tel-sec-prefijo')}
            idNumero={id('tel-sec-numero')}
            idFijo={id('tel-sec-fijo')}
            etiqueta="Teléfono secundario (opcional)"
            prefijo={form.telefono_sec_prefijo}
            numero={form.telefono_sec_numero}
            fijo={form.telefono_sec_fijo}
            error={erroresForm.telefono_secundario}
            onPrefijoChange={(v) => onChange((f) => ({ ...f, telefono_sec_prefijo: v, telefono_sec_numero: '', telefono_sec_fijo: '' }))}
            onNumeroChange={(v) => onChange((f) => ({ ...f, telefono_sec_numero: v }))}
            onFijoChange={(v) => onChange((f) => ({ ...f, telefono_sec_fijo: v }))}
            onLimpiarError={() => onLimpiarError('telefono_secundario')}
          />
        )}
      </section>

      <div className="drawer-form__campo">
        <label className="drawer-form__label" htmlFor={id('direccion')}>Dirección</label>
        <input
          id={id('direccion')}
          className="drawer-form__input"
          value={form.direccion}
          onChange={(e) => onChange((f) => ({ ...f, direccion: e.target.value }))}
          placeholder="Calle, número, urbanización, edificio, piso, apto."
        />
      </div>

      <section className="fp-form-seccion">
        <h3 className="fp-form-seccion__titulo">Ubicación</h3>
        <div className="drawer-form__ubicacion">
          <p className="drawer-form__ubicacion-hint">
            Primero elige el estado; después selecciona la ciudad.
          </p>
          <div className="drawer-form__fila-2">
            <div className="drawer-form__campo">
              <label className="drawer-form__label" htmlFor={id('estado')}>
                1. Estado <span className="drawer-form__req">*</span>
              </label>
              <select
                id={id('estado')}
                className="drawer-form__input"
                value={form.estado_id}
                disabled={cargandoEstados}
                onChange={(e) => {
                  onChange((f) => ({ ...f, estado_id: e.target.value, ciudad_id: '' }));
                  onLimpiarError('estado_id');
                  onLimpiarError('ciudad_id');
                }}
              >
                <option value="">
                  {cargandoEstados ? 'Cargando estados…' : 'Seleccionar estado…'}
                </option>
                {estados.map((e) => (
                  <option key={e.id} value={String(e.id)}>{e.nombre}</option>
                ))}
              </select>
              {erroresForm.estado_id && <p className="clientes__campo-error">{erroresForm.estado_id}</p>}
            </div>
            <div className="drawer-form__campo">
              <label className="drawer-form__label" htmlFor={id('ciudad')}>
                2. Ciudad <span className="drawer-form__req">*</span>
              </label>
              <select
                id={id('ciudad')}
                className="drawer-form__input"
                value={form.ciudad_id}
                disabled={!form.estado_id || cargandoCiudades || cargandoEstados}
                onChange={(e) => {
                  onChange((f) => ({ ...f, ciudad_id: e.target.value }));
                  onLimpiarError('ciudad_id');
                }}
              >
                <option value="">
                  {!form.estado_id
                    ? 'Primero selecciona el estado'
                    : cargandoCiudades
                      ? 'Cargando ciudades…'
                      : 'Seleccionar ciudad…'}
                </option>
                {ciudades.map((c) => (
                  <option key={c.id} value={String(c.id)}>{c.nombre}</option>
                ))}
              </select>
              {erroresForm.ciudad_id && <p className="clientes__campo-error">{erroresForm.ciudad_id}</p>}
            </div>
          </div>
        </div>
      </section>

      {!esAcompanante && (
        <div className="drawer-form__campo">
          <label className="drawer-form__label" htmlFor={id('notas')}>Notas</label>
          <textarea
            id={id('notas')}
            className="drawer-form__input drawer-form__textarea"
            value={form.notas}
            onChange={(e) => onChange((f) => ({ ...f, notas: e.target.value.slice(0, 1000) }))}
            maxLength={1000}
            placeholder="Ej: Cliente interesado en Morrocoy, captado por WhatsApp…"
          />
        </div>
      )}
    </div>
  );
}
