import { useEffect, useState } from 'react';
import Boton from '../../ui/Boton/Boton';
import Entrada from '../../ui/Entrada/Entrada';
import type { Banco } from '../../../types/pagos';
import { formatearBs, formatearEuro } from '../../../utils/formatoMoneda';
import { DEPOSITO_MINIMO_EUR } from '../../../types/pagosPortal';
import { esFechaFutura, fechaHoyIso, MENSAJE_FECHA_NO_FUTURA } from '../../../utils/validacionesFormulario';
import './FormularioPago.css';

interface FormularioPagoProps {
  totalEstimado: number;
  adultos: number;
  menores: number;
  precioBase: number;
  recargoMenor: number;
  totalReservaEur?: number;
  saldoPendienteEur?: number;
  totalBsReserva?: number | null;
  saldoBsPendiente?: number | null;
  montoInicialBs?: number | null;
  depositoMinimoEur?: number;
  modoAbono?: boolean;
  titulo?: string;
  subtitulo?: string;
  etiquetaPaso?: string;
  tasaValor?: number | null;
  bancos?: Banco[];
  sinTasa?: boolean;
  cargandoResumen?: boolean;
  onSubmit: (datos: {
    metodo: string;
    banco: string;
    referencia: string;
    monto: string;
    fecha: string;
    comprobanteArchivo: File | null;
  }) => void;
  onBack: () => void;
}

export default function FormularioPago({
  totalEstimado,
  adultos,
  menores,
  precioBase,
  recargoMenor,
  totalReservaEur,
  saldoPendienteEur,
  totalBsReserva,
  saldoBsPendiente,
  montoInicialBs,
  depositoMinimoEur = DEPOSITO_MINIMO_EUR,
  modoAbono = false,
  titulo,
  subtitulo,
  etiquetaPaso = 'Paso 3',
  tasaValor,
  bancos,
  sinTasa = false,
  cargandoResumen = false,
  onSubmit,
  onBack,
}: FormularioPagoProps) {
  const totalMostrarEur = totalReservaEur ?? totalEstimado;
  const saldoMostrarEur = saldoPendienteEur ?? totalEstimado;
  const totalMostrarBs = totalBsReserva;
  const saldoMostrarBs = saldoBsPendiente;
  const montoPrefillBs = montoInicialBs ?? null;
  const bancosLista = bancos?.length ? bancos : null;
  const esPrimeraReserva = !modoAbono && saldoMostrarEur >= totalMostrarEur - 0.01;
  const montoInicialEur = Math.min(depositoMinimoEur, saldoMostrarEur);
  const montoInicialMostrarBs =
    montoPrefillBs ??
    (tasaValor != null ? Math.round(montoInicialEur * tasaValor * 100) / 100 : null);

  const [metodo, setMetodo] = useState('pago_movil');
  const [banco, setBanco] = useState('');
  const [referencia, setReferencia] = useState('');
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState(fechaHoyIso());
  const [comprobanteArchivo, setComprobanteArchivo] = useState<File | null>(null);
  const [urlVistaPrevia, setUrlVistaPrevia] = useState<string | null>(null);
  const [estaArrastrando, setEstaArrastrando] = useState(false);

  const montoActualNum = Number(monto);
  const montoActualValido = Number.isFinite(montoActualNum) && montoActualNum > 0;
  const saldoRestanteBs =
    saldoMostrarBs != null && montoActualValido
      ? Math.max(Math.round((saldoMostrarBs - montoActualNum) * 100) / 100, 0)
      : saldoMostrarBs != null && montoInicialMostrarBs != null
        ? Math.max(Math.round((saldoMostrarBs - montoInicialMostrarBs) * 100) / 100, 0)
        : null;
  const saldoRestanteEur =
    montoActualValido && tasaValor
      ? Math.max(Math.round((saldoMostrarEur - montoActualNum / tasaValor) * 100) / 100, 0)
      : Math.max(Math.round((saldoMostrarEur - montoInicialEur) * 100) / 100, 0);

  const esPagoTotal =
    montoActualValido &&
    ((tasaValor != null && montoActualNum / tasaValor >= saldoMostrarEur - 0.01) ||
      (saldoMostrarBs != null && montoActualNum >= saldoMostrarBs - 0.01));
  const esPagoDeposito = esPrimeraReserva && !esPagoTotal;

  useEffect(() => {
    if (montoPrefillBs != null && montoPrefillBs > 0) {
      setMonto(montoPrefillBs.toFixed(2));
    } else if (saldoMostrarBs != null && saldoMostrarBs > 0) {
      setMonto(saldoMostrarBs.toFixed(2));
    } else if (saldoMostrarEur > 0) {
      setMonto(saldoMostrarEur.toFixed(2));
    }
  }, [montoPrefillBs, saldoMostrarBs, saldoMostrarEur]);

  useEffect(() => {
    if (bancosLista?.length) {
      setBanco((prev) => {
        if (prev && bancosLista.some((b) => b.nombre === prev)) return prev;
        return bancosLista[0].nombre;
      });
    } else if (!banco) {
      setBanco('Banco de Venezuela');
    }
  }, [bancosLista, banco]);

  const manejarCambioArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const archivo = e.target.files[0];
      setComprobanteArchivo(archivo);
      setUrlVistaPrevia(URL.createObjectURL(archivo));
    }
  };

  const manejarArrastreSobre = (e: React.DragEvent) => {
    e.preventDefault();
    setEstaArrastrando(true);
  };

  const manejarArrastreFuera = () => {
    setEstaArrastrando(false);
  };

  const manejarSoltar = (e: React.DragEvent) => {
    e.preventDefault();
    setEstaArrastrando(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const archivo = e.dataTransfer.files[0];
      setComprobanteArchivo(archivo);
      setUrlVistaPrevia(URL.createObjectURL(archivo));
    }
  };

  const manejarEnvio = (e: React.FormEvent) => {
    e.preventDefault();
    if (sinTasa) {
      alert('No hay tasa de cambio disponible. Intente más tarde o contacte a la agencia.');
      return;
    }
    if (!referencia || !monto) {
      alert('Por favor complete los campos obligatorios.');
      return;
    }
    const montoNum = Number(monto);
    if (!Number.isFinite(montoNum) || montoNum <= 0) {
      alert('Ingrese un monto válido en bolívares.');
      return;
    }
    if (saldoMostrarBs != null && montoNum > saldoMostrarBs + 0.01) {
      alert(`El monto no puede superar el saldo pendiente (${formatearBs(saldoMostrarBs)}).`);
      return;
    }
    if (!comprobanteArchivo) {
      alert('Por favor suba el comprobante o captura del pago.');
      return;
    }
    if (esFechaFutura(fecha)) {
      alert(MENSAJE_FECHA_NO_FUTURA);
      return;
    }
    onSubmit({ metodo, banco, referencia, monto, fecha, comprobanteArchivo });
  };

  return (
    <form className="formulario-pago" onSubmit={manejarEnvio}>
      {/* Cabecera */}
      <div className="formulario-pago__header">
        <span className="formulario-pago__tag">{etiquetaPaso}</span>
        <h2 className="formulario-pago__title">
          {titulo ??
            (modoAbono
              ? 'Abonar saldo'
              : esPagoTotal
                ? 'Pago total'
                : esPagoDeposito
                  ? 'Pago inicial'
                  : 'Información de pago')}
        </h2>
        <p className="formulario-pago__subtitle">
          {subtitulo ??
            (modoAbono
              ? 'Reporta un nuevo pago parcial o liquida el saldo restante de tu reserva.'
              : esPagoTotal
                ? 'Estás pagando el monto completo del viaje. Una vez validado el pago, tu reserva quedará saldada.'
                : esPagoDeposito
                  ? `Para confirmar tu reserva solo necesitas abonar el depósito inicial de ${formatearEuro(depositoMinimoEur)}. También puedes pagar el total ahora si lo prefieres.`
                  : 'Ingresa los detalles de tu transferencia o pago móvil para registrar tu viaje.')}
        </p>
      </div>

      {/* Cuerpo del formulario */}
      <div className="formulario-pago__body">

        {/* Desglose de lo que debe pagar */}
        <div className="formulario-pago__resumen">
          <p className="formulario-pago__resumen-titulo">Resumen de la reserva</p>
          {!modoAbono && (
            <div className="formulario-pago__resumen-lineas">
              <span>{adultos} adulto{adultos !== 1 ? 's' : ''} × €{precioBase.toFixed(2)} = €{(adultos * precioBase).toFixed(2)}</span>
              {menores > 0 && (
                <span>{menores} menor{menores !== 1 ? 'es' : ''} × €{recargoMenor.toFixed(2)} (recargo) = €{(menores * recargoMenor).toFixed(2)}</span>
              )}
            </div>
          )}
          <div className="formulario-pago__resumen-total">
            Total del viaje: {formatearEuro(totalMostrarEur)}
            {totalMostrarBs != null && (
              <span className="formulario-pago__resumen-equivalente">
                Equivalente: {formatearBs(totalMostrarBs)}
              </span>
            )}
          </div>

          {esPagoDeposito && montoInicialMostrarBs != null && (
            <div className="formulario-pago__deposito">
              <span className="formulario-pago__deposito-etiqueta">Pago inicial para reservar</span>
              <strong className="formulario-pago__deposito-monto">
                {formatearEuro(montoInicialEur)}
                <span>{formatearBs(montoInicialMostrarBs)}</span>
              </strong>
              <p className="formulario-pago__deposito-nota">
                No necesitas pagar el total ahora. Con este depósito queda confirmada tu reserva.
                {saldoMostrarBs != null && (
                  <> Para saldar de una vez, ingresa {formatearBs(saldoMostrarBs)}.</>
                )}
              </p>
            </div>
          )}

          {esPagoTotal && saldoMostrarBs != null && (
            <div className="formulario-pago__pago-total">
              <span className="formulario-pago__pago-total-etiqueta">Pago total del viaje</span>
              <strong className="formulario-pago__pago-total-monto">
                {formatearEuro(saldoMostrarEur)}
                <span>{formatearBs(saldoMostrarBs)}</span>
              </strong>
              <p className="formulario-pago__pago-total-nota">
                Al validarse este pago, no quedará saldo pendiente en tu reserva.
              </p>
            </div>
          )}

          {!esPagoTotal && (saldoRestanteBs != null || saldoRestanteEur > 0.01) && (
            <div className="formulario-pago__saldo-restante">
              <span>
                {esPagoDeposito || modoAbono ? 'Saldo que quedará pendiente' : 'Saldo pendiente'}
              </span>
              <strong>
                {saldoRestanteBs != null ? formatearBs(saldoRestanteBs) : formatearEuro(saldoRestanteEur)}
                {saldoRestanteBs != null && tasaValor ? (
                  <span className="formulario-pago__saldo-restante-eur">
                    ≈ {formatearEuro(saldoRestanteEur)}
                  </span>
                ) : null}
              </strong>
            </div>
          )}

          {modoAbono && depositoMinimoEur > 0 && (
            <p className="formulario-pago__resumen-aviso">
              Cada abono debe ser de al menos {formatearEuro(depositoMinimoEur)}, salvo que liquide el saldo completo.
            </p>
          )}

          {tasaValor != null && (
            <p className="formulario-pago__resumen-tasa">
              Tasa del día: Bs. {tasaValor.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / €
            </p>
          )}
        </div>

        {sinTasa && (
          <div style={{ marginBottom: '1rem', padding: '0.875rem 1rem', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', color: 'var(--color-error)', fontSize: '0.875rem' }}>
            No hay tasa de cambio del día registrada. No es posible reportar el pago en este momento.
          </div>
        )}

        <div className="formulario-pago__row">
          <div className="formulario-pago__field">
            <label className="formulario-pago__label">Método de Pago</label>
            <select
              className="formulario-pago__select"
              value={metodo}
              onChange={(e) => setMetodo(e.target.value)}
            >
              <option value="pago_movil">Pago Móvil</option>
              <option value="transferencia">Transferencia Bancaria</option>
            </select>
          </div>

          <div className="formulario-pago__field">
            <label className="formulario-pago__label">Banco Emisor</label>
            <select
              className="formulario-pago__select"
              value={banco}
              onChange={(e) => setBanco(e.target.value)}
            >
              {bancosLista ? (
                bancosLista.map((b) => (
                  <option key={b.id} value={b.nombre}>
                    {b.nombre}
                  </option>
                ))
              ) : (
                <>
                  <option value="Banco de Venezuela">Banco de Venezuela</option>
                  <option value="Banesco">Banesco</option>
                  <option value="Mercantil">Mercantil</option>
                  <option value="Provincial">Provincial</option>
                  <option value="BNC">BNC (Banco Nacional de Crédito)</option>
                </>
              )}
            </select>
          </div>
        </div>

        <div className="formulario-pago__row">
          <Entrada
            etiqueta="Número de Referencia"
            type="text"
            placeholder="Ej: 12345678"
            value={referencia}
            onChange={(e) => setReferencia(e.target.value.replace(/\D/g, ''))}
            required
            className="formulario-pago__input-group"
          />

          <Entrada
            etiqueta={
              esPagoTotal
                ? 'Monto pagado (Bs)'
                : esPagoDeposito
                  ? 'Monto del pago inicial (Bs)'
                  : modoAbono
                    ? 'Monto de este abono (Bs)'
                    : 'Monto pagado (Bs)'
            }
            type="number"
            step="0.01"
            placeholder={
              esPagoTotal && saldoMostrarBs != null
                ? saldoMostrarBs.toFixed(2)
                : montoInicialMostrarBs != null
                  ? montoInicialMostrarBs.toFixed(2)
                  : 'Ej: 1250.00'
            }
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            required
            className="formulario-pago__input-group"
          />
        </div>

        {esPagoDeposito && montoInicialMostrarBs != null && (
          <p className="formulario-pago__monto-ayuda">
            Sugerido: {formatearBs(montoInicialMostrarBs)} ({formatearEuro(montoInicialEur)}). Mínimo en este primer pago; puedes abonar más o el total completo.
          </p>
        )}

        <div className="formulario-pago__row">
          <Entrada
            etiqueta="Fecha de Transacción"
            type="date"
            max={fechaHoyIso()}
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            required
            className="formulario-pago__input-group"
          />
        </div>

        <div className="formulario-pago__field">
          <label className="formulario-pago__label">Comprobante de Pago (Captura)</label>
          <div
            className={`formulario-pago__dropzone ${estaArrastrando ? 'formulario-pago__dropzone--dragging' : ''} ${comprobanteArchivo ? 'formulario-pago__dropzone--has-file' : ''}`}
            onDragOver={manejarArrastreSobre}
            onDragLeave={manejarArrastreFuera}
            onDrop={manejarSoltar}
          >
            <input
              type="file"
              id="receipt-upload"
              className="formulario-pago__file-input"
              accept="image/*"
              onChange={manejarCambioArchivo}
            />
            <label htmlFor="receipt-upload" className="formulario-pago__dropzone-label">
              {urlVistaPrevia ? (
                <div className="formulario-pago__preview">
                  <img src={urlVistaPrevia} alt="Comprobante" className="formulario-pago__preview-image" />
                  <span className="formulario-pago__preview-text">Cambiar comprobante cargado</span>
                </div>
              ) : (
                <div className="formulario-pago__dropzone-content">
                  <span className="formulario-pago__dropzone-icon">📸</span>
                  <span className="formulario-pago__dropzone-text">Arrastra el capture aquí o haz clic para subir</span>
                  <span className="formulario-pago__dropzone-sub">Formatos JPG, PNG. Máx 5MB</span>
                </div>
              )}
            </label>
          </div>
        </div>
      </div>

      {/* Footer con botones */}
      <div className="formulario-pago__footer" style={{ display: 'flex', gap: '1rem' }}>
        <Boton type="button" variante="secundario" tamano="md" onClick={onBack}>
          Atrás
        </Boton>
        <Boton type="submit" variante="primario" tamano="md" anchoCompleto className="formulario-pago__submit-btn" disabled={sinTasa || cargandoResumen}>
          Registrar pago
        </Boton>
      </div>
    </form>
  );
}
