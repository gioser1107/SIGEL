import type { ResumenPagosReserva } from '../../../../../types/pagos';

import { formatearEuro } from '../../../../../utils/formatoMoneda';

import { calcularSaldoBs } from '../utils/calculosPago';

import './ResumenPagosReserva.css';



interface ResumenPagosReservaProps {

  resumen: ResumenPagosReserva;

  tasaValor?: number;

}



function ValorEuroBs({ eur, tasaValor }: { eur: number; tasaValor?: number }) {

  const mostrarBs = tasaValor != null && tasaValor > 0;

  return (

    <span className="pagos-reserva-resumen__valor-linea">

      <span>{formatearEuro(eur)}</span>

      {mostrarBs && (

        <span className="pagos-reserva-resumen__bs">

          {calcularSaldoBs(eur, tasaValor).toLocaleString('es-VE', {

            minimumFractionDigits: 2,

            maximumFractionDigits: 2,

          })}{' '}

          Bs

        </span>

      )}

    </span>

  );

}



export default function ResumenPagosReservaCard({ resumen, tasaValor }: ResumenPagosReservaProps) {

  return (

    <div className="pagos-reserva-resumen">

      <div className="pagos-reserva-resumen__item">

        <span className="pagos-reserva-resumen__etiqueta">Total reserva</span>

        <ValorEuroBs eur={resumen.total_reserva_eur} tasaValor={tasaValor} />

      </div>

      <div className="pagos-reserva-resumen__item">

        <span className="pagos-reserva-resumen__etiqueta">Pagado (aprobado)</span>

        <span className="pagos-reserva-resumen__valor pagos-reserva-resumen__valor--ok">

          <ValorEuroBs eur={resumen.total_pagado_aprobado_eur} tasaValor={tasaValor} />

        </span>

      </div>

      <div className="pagos-reserva-resumen__item">

        <span className="pagos-reserva-resumen__etiqueta">Pend. validación</span>

        <ValorEuroBs eur={resumen.total_pendiente_validacion_eur} tasaValor={tasaValor} />

      </div>

      <div className="pagos-reserva-resumen__item pagos-reserva-resumen__item--saldo">

        <span className="pagos-reserva-resumen__etiqueta">Saldo pendiente</span>

        <span className="pagos-reserva-resumen__valor pagos-reserva-resumen__valor--saldo">

          <ValorEuroBs eur={resumen.saldo_pendiente_eur} tasaValor={tasaValor} />

        </span>

      </div>

      <p className="pagos-reserva-resumen__meta">

        {resumen.destino.nombre} · {resumen.cantidad_pasajeros} pasajero(s) · {resumen.cantidad_pagos} pago(s)

        {resumen.pagado_completo && ' · Pagado completo'}

        {!resumen.pagado_completo && resumen.deposito_minimo_cumplido && ' · Depósito mínimo cumplido'}

        {!resumen.pagado_completo && !resumen.deposito_minimo_cumplido && resumen.deposito_minimo_eur != null && (
          ` · Depósito mínimo pendiente (${formatearEuro(resumen.deposito_minimo_eur)})`
        )}

        {tasaValor != null && tasaValor > 0 && ` · Tasa ${tasaValor} Bs/€`}

      </p>

    </div>

  );

}


