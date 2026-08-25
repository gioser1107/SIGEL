import { CODIGOS_TELEFONO_VE, PREFIJO_TELEFONO_FIJO } from '../../../../utils/validacionesCliente';
import './CampoTelefono.css';

interface CampoTelefonoProps {
  idPrefijo: string;
  idNumero: string;
  idFijo: string;
  etiqueta: string;
  prefijo: string;
  numero: string;
  fijo: string;
  error?: string;
  onPrefijoChange: (valor: string) => void;
  onNumeroChange: (valor: string) => void;
  onFijoChange: (valor: string) => void;
  onLimpiarError?: () => void;
}

export default function CampoTelefono({
  idPrefijo,
  idNumero,
  idFijo,
  etiqueta,
  prefijo,
  numero,
  fijo,
  error,
  onPrefijoChange,
  onNumeroChange,
  onFijoChange,
  onLimpiarError,
}: CampoTelefonoProps) {
  const esFijo = prefijo === PREFIJO_TELEFONO_FIJO;

  return (
    <div className="drawer-form__campo">
      <label className="drawer-form__label" htmlFor={idPrefijo}>{etiqueta}</label>
      <div className="clientes__telefono-fila">
        <select
          id={idPrefijo}
          className="drawer-form__input"
          value={prefijo}
          onChange={(e) => {
            onPrefijoChange(e.target.value);
            onLimpiarError?.();
          }}
        >
          <option value="">Código</option>
          {CODIGOS_TELEFONO_VE.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
          <option value={PREFIJO_TELEFONO_FIJO}>Fijo / otro</option>
        </select>
        {esFijo ? (
          <input
            id={idFijo}
            className="drawer-form__input"
            type="tel"
            inputMode="numeric"
            placeholder="02511234567"
            maxLength={11}
            value={fijo}
            onChange={(e) => {
              onFijoChange(e.target.value.replace(/\D/g, '').slice(0, 11));
              onLimpiarError?.();
            }}
            onKeyDown={(e) => {
              const permitidas = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
              if (permitidas.includes(e.key)) return;
              if (!/^\d$/.test(e.key)) e.preventDefault();
            }}
          />
        ) : (
          <input
            id={idNumero}
            className="drawer-form__input"
            type="tel"
            inputMode="numeric"
            placeholder="1234567"
            maxLength={7}
            value={numero}
            onChange={(e) => {
              onNumeroChange(e.target.value.replace(/\D/g, '').slice(0, 7));
              onLimpiarError?.();
            }}
            onKeyDown={(e) => {
              const permitidas = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
              if (permitidas.includes(e.key)) return;
              if (!/^\d$/.test(e.key)) e.preventDefault();
            }}
          />
        )}
      </div>
      {error && <p className="clientes__campo-error">{error}</p>}
    </div>
  );
}
