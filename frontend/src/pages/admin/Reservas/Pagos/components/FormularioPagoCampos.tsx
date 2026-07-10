import type { CatalogoPagos, FormularioPagoDraft, ResumenPagosReserva, TasaDelDiaRespuesta } from '../../../../../types/pagos';

import { formatearEuro } from '../../../../../utils/formatoMoneda';

import {

  calcularMontoEurInformativo,

  calcularSaldoBs,

  esMonedaBolivares,

  esMonedaUsd,

  formatearMontoInput,

  montoUsdEquivalenteEur,

} from '../utils/calculosPago';

import { equivalenciaEurEstimada } from '../utils/formatoPago';

import CampoComprobanteImagen from './CampoComprobanteImagen';

import { sanitizarMonto, sanitizarTelefono } from '../constants';

import {
  requiereBancos,
  requiereCorreo,
  requierePuntoVenta,
  requiereTelefono,
  requiereComprobante,
  esEfectivoUsd,
  tituloDatosMetodo,
  tituloSeccionMetodo,
  etiquetaMonedaMetodo,
} from '../utils/metodosPagoUi';



interface FormularioPagoCamposProps {

  form: FormularioPagoDraft;

  catalogo: CatalogoPagos;

  resumen: ResumenPagosReserva;

  tasaDelDia: TasaDelDiaRespuesta | null;

  sinTasa: boolean;

  onChange: (form: FormularioPagoDraft) => void;

}



export default function FormularioPagoCampos({

  form,

  catalogo,

  resumen,

  tasaDelDia,

  sinTasa,

  onChange,

}: FormularioPagoCamposProps) {

  const metodo = catalogo.metodos_pago.find((m) => String(m.id) === form.metodo_pago_id);

  const codigo = metodo?.codigo ?? '';

  const montoNum = Number(form.monto);

  const tasaValor = tasaDelDia?.valor ?? 0;

  const saldoEur = resumen.saldo_pendiente_eur;

  const saldoBs = calcularSaldoBs(saldoEur, tasaValor);

  const tituloDatos = tituloDatosMetodo(codigo);

  const bloqueadoBs = esMonedaBolivares(metodo) && sinTasa;



  return (

    <div className="pagos-formulario">

      <div className="pagos-formulario__encabezado">

        <h5 className="pagos-formulario__titulo">{tituloSeccionMetodo(codigo)}</h5>

        <p className="pagos-formulario__subtitulo">

          Ingresa el monto de esta cuota en la moneda del método. Puedes registrar varios pagos hasta cubrir el saldo.

        </p>

      </div>



      {bloqueadoBs && (

        <div className="pagos-formulario__aviso pagos-formulario__aviso--error" role="alert">

          No hay tasa de cambio registrada. Registra una tasa en Administración → Pagos antes de cobrar en bolívares.

        </div>

      )}



      <div className="pagos-formulario__monto-grupo">

        <label className="pagos-formulario__label" htmlFor="pago-monto">Monto</label>

        <div className={`pagos-formulario__monto${bloqueadoBs ? ' pagos-formulario__monto--bloqueado' : ''}`}>

          <input

            id="pago-monto"

            className="pagos-formulario__monto-input"

            type="number"

            min="0"

            step="0.01"

            value={form.monto}

            disabled={bloqueadoBs}

            onChange={(e) => onChange({ ...form, monto: sanitizarMonto(e.target.value) })}

            placeholder="Ej: 500.00"

          />

          <span className="pagos-formulario__monto-moneda">
            {form.monto ? formatearMontoInput(form.monto) : '—'} {etiquetaMonedaMetodo(metodo)}
          </span>

        </div>



        <div className="pagos-formulario__saldo-info">

          <span>Saldo pendiente: <strong>{formatearEuro(saldoEur)}</strong></span>

          {tasaValor > 0 && esMonedaBolivares(metodo) && (

            <span> ≈ <strong>{saldoBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs</strong></span>

          )}

        </div>



        {montoNum > 0 && esMonedaBolivares(metodo) && tasaValor > 0 && (

          <p className="pagos-formulario__hint">

            {equivalenciaEurEstimada(montoNum, tasaValor)} · Tasa {tasaValor} Bs/€

            {tasaDelDia && !tasaDelDia.es_del_dia && ' (tasa más reciente, no es de hoy)'}

          </p>

        )}



      </div>



      {(tituloDatos || requiereBancos(codigo) || requierePuntoVenta(codigo) || requiereCorreo(codigo)) && (

        <div className="pagos-formulario__datos">

          {tituloDatos && <p className="pagos-formulario__datos-titulo">{tituloDatos.toUpperCase()}</p>}



          {requiereBancos(codigo) && (

            <div className="pagos-formulario__fila-3">

              <div className="pagos-formulario__campo">

                <label className="pagos-formulario__label" htmlFor="pago-banco-origen">Banco de origen</label>

                <select

                  id="pago-banco-origen"

                  className="pagos-formulario__input"

                  value={form.banco_origen_id}

                  onChange={(e) => onChange({ ...form, banco_origen_id: e.target.value })}

                >

                  <option value="">Selecciona un banco</option>

                  {catalogo.bancos.map((b) => (

                    <option key={b.id} value={b.id}>{b.codigo} — {b.nombre}</option>

                  ))}

                </select>

              </div>

              <div className="pagos-formulario__campo">

                <label className="pagos-formulario__label" htmlFor="pago-banco-destino">Banco de destino</label>

                <select

                  id="pago-banco-destino"

                  className="pagos-formulario__input"

                  value={form.banco_destino_id}

                  onChange={(e) => onChange({ ...form, banco_destino_id: e.target.value })}

                >

                  <option value="">Selecciona un banco</option>

                  {catalogo.bancos.map((b) => (

                    <option key={b.id} value={b.id}>{b.codigo} — {b.nombre}</option>

                  ))}

                </select>

              </div>

              <div className="pagos-formulario__campo">

                <label className="pagos-formulario__label" htmlFor="pago-fecha">Fecha de pago</label>

                <input

                  id="pago-fecha"

                  type="date"

                  className="pagos-formulario__input"

                  value={form.fecha_pago}

                  onChange={(e) => onChange({ ...form, fecha_pago: e.target.value })}

                />

              </div>

            </div>

          )}



          {requiereTelefono(codigo) && (

            <div className="pagos-formulario__fila-2">

              <div className="pagos-formulario__campo">

                <label className="pagos-formulario__label" htmlFor="pago-telefono">Teléfono de origen</label>

                <input

                  id="pago-telefono"

                  className="pagos-formulario__input"

                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={11}
                  value={form.telefono_origen}
                  onChange={(e) => onChange({ ...form, telefono_origen: sanitizarTelefono(e.target.value) })}

                  placeholder="04141234567"

                />

              </div>

              <div className="pagos-formulario__campo">

                <label className="pagos-formulario__label" htmlFor="pago-referencia">Referencia</label>

                <input

                  id="pago-referencia"

                  className="pagos-formulario__input"

                  value={form.referencia}

                  onChange={(e) => onChange({ ...form, referencia: e.target.value.replace(/\D/g, '').slice(0, 12) })}

                  placeholder="000000"

                />

                <small className="pagos-formulario__hint">

                  Indica los últimos 6 dígitos de la referencia del comprobante (solo números).

                </small>

              </div>

            </div>

          )}

          {requiereCorreo(codigo) && (
            <>
            <div className="pagos-formulario__fila-2">
              <div className="pagos-formulario__campo">
                <label className="pagos-formulario__label" htmlFor="pago-fecha-z">Fecha de pago</label>
                <input
                  id="pago-fecha-z"
                  type="date"
                  className="pagos-formulario__input"
                  value={form.fecha_pago}
                  onChange={(e) => onChange({ ...form, fecha_pago: e.target.value })}
                />
              </div>
              <div className="pagos-formulario__campo">
                <label className="pagos-formulario__label" htmlFor="pago-correo">Correo origen (Zelle)</label>

                <input

                  id="pago-correo"

                  type="email"

                  className="pagos-formulario__input"

                  value={form.correo_origen}

                  onChange={(e) => onChange({ ...form, correo_origen: e.target.value })}

                  placeholder="cliente@gmail.com"

                />

              </div>

              <div className="pagos-formulario__campo">

                <label className="pagos-formulario__label" htmlFor="pago-referencia-z">Referencia</label>

                <input

                  id="pago-referencia-z"

                  className="pagos-formulario__input"

                  value={form.referencia}

                  onChange={(e) => onChange({ ...form, referencia: e.target.value })}

                  placeholder="ZELLE123"

                />

              </div>

            </div>
            </>
          )}

          {requierePuntoVenta(codigo) && (

            <>

              <div className="pagos-formulario__fila-2">

                <div className="pagos-formulario__campo">

                  <label className="pagos-formulario__label" htmlFor="pago-fecha-tpv">Fecha de pago</label>

                  <input

                    id="pago-fecha-tpv"

                    type="date"

                    className="pagos-formulario__input"

                    value={form.fecha_pago}

                    onChange={(e) => onChange({ ...form, fecha_pago: e.target.value })}

                  />

                </div>

                <div className="pagos-formulario__campo">

                  <label className="pagos-formulario__label" htmlFor="pago-referencia-tpv">Referencia</label>

                  <input

                    id="pago-referencia-tpv"

                    className="pagos-formulario__input"

                    value={form.referencia}

                    onChange={(e) => onChange({ ...form, referencia: e.target.value })}

                    placeholder="Nº de lote o referencia"

                  />

                </div>

              </div>

              <div className="pagos-formulario__tpv-box">

                <p className="pagos-formulario__tpv-ayuda">

                  Solo para pagos Punto: elige el terminal con el que se cobró este monto.

                </p>

                <div className="pagos-formulario__campo">

                  <label className="pagos-formulario__label" htmlFor="pago-tpv">TPV</label>

                  <select

                    id="pago-tpv"

                    className="pagos-formulario__input"

                    value={form.punto_venta_id}

                    onChange={(e) => onChange({ ...form, punto_venta_id: e.target.value })}

                  >

                    <option value="">— Elegir terminal —</option>

                    {catalogo.puntos_venta.map((pv) => (

                      <option key={pv.id} value={pv.id}>{pv.nombre} ({pv.codigo})</option>

                    ))}

                  </select>

                </div>

              </div>

            </>

          )}



          {codigo === 'transferencia' && (

            <div className="pagos-formulario__fila-2">

              <div className="pagos-formulario__campo">

                <label className="pagos-formulario__label" htmlFor="pago-referencia-tr">Referencia</label>

                <input

                  id="pago-referencia-tr"

                  className="pagos-formulario__input"

                  value={form.referencia}

                  onChange={(e) => onChange({ ...form, referencia: e.target.value })}

                  placeholder="Nº de referencia"

                />

              </div>

            </div>

          )}

        </div>

      )}

      {esEfectivoUsd(metodo) && (
        <p className="pagos-formulario__hint">
          El monto se registra en dólares. 1 USD = 1 EUR para el saldo de la reserva.
        </p>
      )}

      {requiereComprobante(codigo) && (
        <CampoComprobanteImagen
          valor={form.comprobante_url}
          onChange={(dataUrl) => onChange({ ...form, comprobante_url: dataUrl })}
        />
      )}

      {montoNum > 0 && esMonedaUsd(metodo) && (
        <p className="pagos-formulario__equiv">
          Este pago equivale a{' '}
          <strong>{formatearEuro(montoUsdEquivalenteEur(montoNum))}</strong> del saldo (1 $ = 1 €).
        </p>
      )}

      {montoNum > 0 && esMonedaBolivares(metodo) && tasaValor > 0 && (

        <p className="pagos-formulario__equiv">

          Este pago equivale aproximadamente a{' '}

          <strong>{formatearEuro(calcularMontoEurInformativo(montoNum, tasaValor))}</strong> del saldo.

        </p>

      )}

    </div>

  );

}


