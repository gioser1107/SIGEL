import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import FormularioPago from '../../../components/client/FormularioPago/FormularioPago';
import Boton from '../../../components/ui/Boton/Boton';
import { usePagoPortal } from '../../../hooks/usePagoPortal';
import { ErrorApi } from '../../../services/api';
import { obtenerUsuarioSesion } from '../../../services/autenticacion';
import {
  construirReportePagoPortal,
  obtenerMiReservaPortal,
  montoBsSaldoPendiente,
  montoBsSugerido,
  montoBsTotalReserva,
} from '../../../services/pagosPortal';
import type { ReservaPortalMis } from '../../../types/pagosPortal';
import { ETIQUETA_ESTADO_PAGO_PORTAL } from '../../../types/pagosPortal';
import type { MetodoPagoPortalCodigo } from '../../../types/pagosPortal';
import type { PagoReserva } from '../../../types/pagos';
import { formatearBs } from '../../../utils/formatoMoneda';
import './AbonarReserva.css';

function archivoABase64(archivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('No se pudo leer el comprobante.'));
    };
    reader.onerror = () => reject(new Error('No se pudo leer el comprobante.'));
    reader.readAsDataURL(archivo);
  });
}

export default function AbonarReserva() {
  const { reservaId: reservaIdParam } = useParams<{ reservaId: string }>();
  const reservaId = reservaIdParam ? Number(reservaIdParam) : null;
  const navegar = useNavigate();

  const [reserva, setReserva] = useState<ReservaPortalMis | null>(null);
  const [cargandoReserva, setCargandoReserva] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagoReportado, setPagoReportado] = useState<PagoReserva | null>(null);
  const [datosPago, setDatosPago] = useState<{
    metodo: string;
    banco: string;
    referencia: string;
    monto: string;
    fecha: string;
  } | null>(null);

  const {
    resumenPortal,
    cargando: cargandoPagoPortal,
    error: errorPagoPortal,
    sinTasa,
    tasaId,
    cotizarMontoEur,
    reportar,
    obtenerBancoDestinoId,
    metodoPagoIdPorCodigo,
  } = usePagoPortal(reservaId);

  const cargarReserva = useCallback(async () => {
    if (!reservaId || Number.isNaN(reservaId)) {
      setError('Reserva no válida.');
      setCargandoReserva(false);
      return;
    }

    setCargandoReserva(true);
    setError(null);
    try {
      const encontrada = await obtenerMiReservaPortal(reservaId);
      if (encontrada.resumen_pagos?.pagado_completo) {
        setError('Esta reserva ya está pagada en su totalidad.');
      }
      setReserva(encontrada);
    } catch (err) {
      setError(
        err instanceof ErrorApi || err instanceof Error
          ? err.message
          : 'No se pudo cargar la reserva.',
      );
    } finally {
      setCargandoReserva(false);
    }
  }, [reservaId]);

  useEffect(() => {
    void cargarReserva();
  }, [cargarReserva]);

  const manejarEnvioPago = async (datos: {
    metodo: string;
    banco: string;
    referencia: string;
    monto: string;
    fecha: string;
    comprobanteArchivo: File | null;
  }) => {
    if (!resumenPortal || !tasaId || !reservaId) return;

    setGuardando(true);
    setError(null);

    try {
      let comprobanteUrl: string | null = null;
      if (datos.comprobanteArchivo) {
        comprobanteUrl = await archivoABase64(datos.comprobanteArchivo);
      }

      const telefonoCliente = obtenerUsuarioSesion()?.telefono?.replace(/\D/g, '') ?? null;

      const payload = await construirReportePagoPortal({
        resumenPortal,
        datos,
        tasaId,
        metodoPagoIdPorCodigo: (codigo: MetodoPagoPortalCodigo) =>
          metodoPagoIdPorCodigo(codigo),
        cotizarMontoEur,
        obtenerBancoDestinoId,
        comprobanteUrl,
        telefonoCliente,
      });

      const respuesta = await reportar(payload);
      setDatosPago({
        metodo: datos.metodo,
        banco: datos.banco,
        referencia: datos.referencia,
        monto: datos.monto,
        fecha: datos.fecha,
      });
      setPagoReportado(respuesta.pago);
    } catch (err) {
      setError(
        err instanceof ErrorApi || err instanceof Error
          ? err.message
          : 'No se pudo registrar el abono.',
      );
    } finally {
      setGuardando(false);
    }
  };

  if (!reservaId || Number.isNaN(reservaId)) {
    return (
      <div className="abonar-reserva">
        <p className="abonar-reserva__error">Reserva no válida.</p>
        <Link to="/client/dashboard">Volver a mis viajes</Link>
      </div>
    );
  }

  const totalReservaEur = resumenPortal?.resumen.total_reserva_eur ?? reserva?.resumen_pagos?.total_reserva_eur ?? 0;
  const saldoPendienteEur = resumenPortal?.resumen.saldo_pendiente_eur ?? reserva?.resumen_pagos?.saldo_pendiente_eur ?? 0;
  const totalBsReserva = resumenPortal ? montoBsTotalReserva(resumenPortal) : null;
  const saldoBsPendiente = resumenPortal ? montoBsSaldoPendiente(resumenPortal) : null;
  const montoInicialBs = resumenPortal ? montoBsSugerido(resumenPortal) : null;
  const depositoMinimoEur =
    resumenPortal?.resumen.deposito_minimo_eur ?? resumenPortal?.deposito_minimo_eur ?? 5;
  const procesando = guardando || cargandoReserva || (cargandoPagoPortal && !resumenPortal);
  const errorVisible = error || errorPagoPortal;
  const exito = pagoReportado != null && datosPago != null;

  return (
    <div className="abonar-reserva">
      <div className="abonar-reserva__header">
        <div>
          <Link to="/client/dashboard" className="abonar-reserva__volver">
            ← Mis viajes
          </Link>
          <h1 className="abonar-reserva__titulo">
            {reserva?.destino_nombre ?? 'Abonar reserva'}
          </h1>
          <p className="abonar-reserva__subtitulo">
            Reporta un abono parcial o liquida el saldo restante de tu reserva.
          </p>
        </div>
      </div>

      {errorVisible && (
        <div className="abonar-reserva__error" role="alert">
          {errorVisible}
        </div>
      )}

      {cargandoReserva ? (
        <p className="abonar-reserva__cargando">Cargando reserva…</p>
      ) : exito ? (
        <div className="abonar-reserva__exito">
          <span className="abonar-reserva__exito-icono">✓</span>
          <h2>Abono reportado</h2>
          <p>
            Referencia {datosPago.referencia} · {formatearBs(parseFloat(datosPago.monto))}
          </p>
          <p className="abonar-reserva__exito-estado">
            {pagoReportado.estado_etiqueta ??
              ETIQUETA_ESTADO_PAGO_PORTAL[pagoReportado.estado ?? 'en_validacion']}
          </p>
          <div className="abonar-reserva__exito-acciones">
            <Boton type="button" variante="secundario" onClick={() => navegar('/client/dashboard')}>
              Volver a mis viajes
            </Boton>
            {!resumenPortal?.resumen.pagado_completo && (
              <Boton
                type="button"
                variante="primario"
                onClick={() => {
                  setPagoReportado(null);
                  setDatosPago(null);
                }}
              >
                Reportar otro abono
              </Boton>
            )}
          </div>
        </div>
      ) : reserva?.resumen_pagos?.pagado_completo ? (
        <div className="abonar-reserva__completo">
          <p>Esta reserva ya está pagada en su totalidad.</p>
          <Link to="/client/dashboard">Volver a mis viajes</Link>
        </div>
      ) : (
        <div className="abonar-reserva__formulario" style={{ position: 'relative' }}>
          {procesando && (
            <div className="abonar-reserva__overlay">
              {guardando ? 'Registrando abono…' : 'Cargando datos de pago…'}
            </div>
          )}
          <FormularioPago
            totalEstimado={totalReservaEur}
            totalReservaEur={totalReservaEur}
            saldoPendienteEur={saldoPendienteEur}
            totalBsReserva={totalBsReserva}
            saldoBsPendiente={saldoBsPendiente}
            montoInicialBs={montoInicialBs}
            depositoMinimoEur={depositoMinimoEur}
            modoAbono
            etiquetaPaso="Abono"
            adultos={1}
            menores={0}
            precioBase={totalReservaEur}
            recargoMenor={0}
            bancos={resumenPortal?.bancos}
            sinTasa={sinTasa}
            cargandoResumen={cargandoPagoPortal && !resumenPortal}
            onSubmit={manejarEnvioPago}
            onBack={() => navegar('/client/dashboard')}
          />
        </div>
      )}
    </div>
  );
}
