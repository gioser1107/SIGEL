import type { Rol } from '../../../../types/seguridad';
import { CODIGOS_TELEFONO_VE } from '../../../../utils/validacionesFormulario';
import type { ErroresFormularioUsuario } from '../../../../utils/validacionesFormulario';
import type { FormularioUsuario } from '../constants';
import './FormularioUsuarioCampos.css';

interface FormularioUsuarioCamposProps {
  form: FormularioUsuario;
  erroresForm: ErroresFormularioUsuario;
  roles: Rol[];
  modo: 'crear' | 'editar';
  onChange: (actualizador: (prev: FormularioUsuario) => FormularioUsuario) => void;
  onLimpiarError: (campo: keyof ErroresFormularioUsuario) => void;
}

export default function FormularioUsuarioCampos({
  form,
  erroresForm,
  roles,
  modo,
  onChange,
  onLimpiarError,
}: FormularioUsuarioCamposProps) {
  return (
    <div className="drawer-form">
      <p className="drawer-form__intro">
        Datos de acceso del usuario y rol asignado en el panel.
      </p>
      <div className="drawer-form__campo">
        <label className="drawer-form__label" htmlFor="usuario-nombre">
          Nombre <span className="drawer-form__req">*</span>
        </label>
        <input
          id="usuario-nombre"
          className="drawer-form__input"
          value={form.nombre}
          onChange={(e) => {
            onChange((f) => ({ ...f, nombre: e.target.value }));
            onLimpiarError('nombre');
          }}
        />
        {erroresForm.nombre && (
          <p className="seguridad__campo-error">{erroresForm.nombre}</p>
        )}
      </div>
      <div className="drawer-form__campo">
        <label className="drawer-form__label" htmlFor="usuario-apellido">
          Apellido <span className="drawer-form__req">*</span>
        </label>
        <input
          id="usuario-apellido"
          className="drawer-form__input"
          value={form.apellido}
          onChange={(e) => {
            onChange((f) => ({ ...f, apellido: e.target.value }));
            onLimpiarError('apellido');
          }}
        />
        {erroresForm.apellido && (
          <p className="seguridad__campo-error">{erroresForm.apellido}</p>
        )}
      </div>
      <div className="drawer-form__campo">
        <label className="drawer-form__label" htmlFor="usuario-correo">
          Correo <span className="drawer-form__req">*</span>
        </label>
        <input
          id="usuario-correo"
          type="email"
          className="drawer-form__input"
          placeholder="usuario@travelbqto.com"
          value={form.correo}
          onChange={(e) => {
            onChange((f) => ({ ...f, correo: e.target.value }));
            onLimpiarError('correo');
          }}
        />
        {erroresForm.correo && (
          <p className="seguridad__campo-error">{erroresForm.correo}</p>
        )}
      </div>
      <div className="drawer-form__campo">
        <label className="drawer-form__label">Teléfono</label>
        <div className="seguridad__telefono-fila">
          <select
            id="usuario-telefono-codigo"
            className="drawer-form__input"
            value={form.telefono_codigo}
            onChange={(e) => {
              onChange((f) => ({ ...f, telefono_codigo: e.target.value }));
              onLimpiarError('telefono');
            }}
          >
            <option value="">Código</option>
            {CODIGOS_TELEFONO_VE.map((codigo) => (
              <option key={codigo} value={codigo}>{codigo}</option>
            ))}
          </select>
          <input
            id="usuario-telefono-numero"
            className="drawer-form__input"
            type="tel"
            inputMode="numeric"
            placeholder="1234567"
            maxLength={7}
            value={form.telefono_numero}
            onChange={(e) => {
              const soloDigitos = e.target.value.replace(/\D/g, '').slice(0, 7);
              onChange((f) => ({ ...f, telefono_numero: soloDigitos }));
              onLimpiarError('telefono');
            }}
          />
        </div>
        {erroresForm.telefono && (
          <p className="seguridad__campo-error">{erroresForm.telefono}</p>
        )}
      </div>
      <div className="drawer-form__campo">
        <label className="drawer-form__label" htmlFor="usuario-rol">
          Rol {modo === 'crear' && <span className="drawer-form__req">*</span>}
        </label>
        <select
          id="usuario-rol"
          className="drawer-form__input"
          value={form.rol_id}
          onChange={(e) => {
            onChange((f) => ({ ...f, rol_id: e.target.value }));
            onLimpiarError('rol_id');
          }}
        >
          <option value="">Seleccionar rol…</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>{r.nombre}</option>
          ))}
        </select>
        {erroresForm.rol_id && (
          <p className="seguridad__campo-error">{erroresForm.rol_id}</p>
        )}
      </div>
      <div className="drawer-form__campo">
        <label className="drawer-form__label" htmlFor="usuario-contrasena">
          {modo === 'crear' ? (
            <>Contraseña <span className="drawer-form__req">*</span></>
          ) : (
            'Nueva contraseña (opcional)'
          )}
        </label>
        <input
          id="usuario-contrasena"
          type="password"
          className="drawer-form__input"
          value={form.contrasena}
          onChange={(e) => {
            onChange((f) => ({ ...f, contrasena: e.target.value }));
            onLimpiarError('contrasena');
          }}
        />
        {erroresForm.contrasena && (
          <p className="seguridad__campo-error">{erroresForm.contrasena}</p>
        )}
      </div>
    </div>
  );
}
