import { useState } from 'react';
import Boton from '../../../../../components/ui/Boton/Boton';
import { registrarPagoReserva, actualizarPagoReserva } from '../../../../../services/pagos';
import type {
  CatalogoPagos,
  CrearPagoDTO,
  FormularioPagoDraft,
  MetodoPago,
  ResumenPagosReserva,
  TasaDelDiaRespuesta,
} from '../../../../../types/pagos';
import FormularioPagoCampos from '../components/FormularioPagoCampos';
import SelectorMetodosPago from '../components/SelectorMetodosPago';
import { fechaHoyIso, formularioPagoVacio, validarFormularioPago, esFormularioPagoCompleto, formularioTrasRegistroPago } from '../constants';
import { filtrarMetodosDisponibles } from '../utils/calculosPago';
import { esCobroEnBolivares, estadoInicialPagoAdmin, requiereComprobante, requiereValidacionPagoAdmin } from '../utils/metodosPagoUi';
import { mensajeErrorPago } from '../utils/mensajeError';

interface PanelRegistrarPagoProps {
  reservaId: number;
  catalogo: CatalogoPagos;
  resumen: ResumenPagosReserva;
  tasaDelDia: TasaDelDiaRespuesta | null;
  sinTasa: boolean;
  tasaNoEsDelDia: boolean;
  onRegistrado: () => void;
  onError: (mensaje: string) => void;
}

export default function PanelRegistrarPago({
  reservaId,
  catalogo,
  resumen,
  tasaDelDia,
  sinTasa,
  tasaNoEsDelDia,
  onRegistrado,
  onError,
}: PanelRegistrarPagoProps) {
  const metodos = filtrarMetodosDisponibles(catalogo.metodos_pago);
  const [form, setForm] = useState<FormularioPagoDraft>(() => formularioPagoVacio(fechaHoyIso()));
  const [guardando, setGuardando] = useState(false);

  const tasaId = tasaDelDia?.tasa.id ?? catalogo.tasa_eur_reciente?.id;
  const sinTasaEfectiva = sinTasa && !catalogo.tasa_eur_reciente;

  function seleccionarMetodo(metodo: MetodoPago) {
    if (esCobroEnBolivares(metodo) && sinTasaEfectiva) {
      onError('No hay tasa de cambio. Registra una tasa antes de cobrar en bolívares.');
      return;
    }

    setForm((prev) => ({
      ...prev,
      metodo_pago_id: String(metodo.id),
      tasa_id: tasaId ? String(tasaId) : '',
      monto: '',
      tipo: 'cuota',
      fecha_pago: prev.fecha_pago || fechaHoyIso(),
      banco_origen_id: '',
      banco_destino_id: '',
      punto_venta_id: '',
      telefono_origen: '',
      correo_origen: '',
      referencia: '',
      comprobante_url: '',
    }));
  }

  async function guardar() {
    const metodo = catalogo.metodos_pago.find((m) => String(m.id) === form.metodo_pago_id);

    if (esCobroEnBolivares(metodo) && sinTasaEfectiva) {
      onError('No hay tasa de cambio registrada.');
      return;
    }

    const formConTasa = { ...form, tasa_id: form.tasa_id || (tasaId ? String(tasaId) : '') };
    const errorValidacion = validarFormularioPago(
      formConTasa,
      metodo,
      tasaId,
      resumen,
      tasaDelDia?.valor ?? catalogo.tasa_eur_reciente?.valor,
    );
    if (errorValidacion) {
      onError(errorValidacion);
      return;
    }

    setGuardando(true);
    try {
      const payload: CrearPagoDTO = {
        metodo_pago_id: Number(formConTasa.metodo_pago_id),
        tasa_id: Number(formConTasa.tasa_id),
        monto: Number(formConTasa.monto),
        tipo: formConTasa.tipo,
        fecha_pago: formConTasa.fecha_pago || fechaHoyIso(),
        referencia: formConTasa.referencia.trim() || null,
        banco_origen_id: formConTasa.banco_origen_id ? Number(formConTasa.banco_origen_id) : null,
        banco_destino_id: formConTasa.banco_destino_id ? Number(formConTasa.banco_destino_id) : null,
        punto_venta_id: formConTasa.punto_venta_id ? Number(formConTasa.punto_venta_id) : null,
        telefono_origen: formConTasa.telefono_origen.trim() || null,
        correo_origen: formConTasa.correo_origen.trim() || null,
        comprobante_url:
          metodo && requiereComprobante(metodo.codigo) && formConTasa.comprobante_url.trim()
            ? formConTasa.comprobante_url.trim()
            : null,
        notas: null,
        estado: metodo ? estadoInicialPagoAdmin(metodo.codigo) : 'aprobado',
      };

      const respuesta = await registrarPagoReserva(reservaId, payload);

      if (
        metodo &&
        !requiereValidacionPagoAdmin(metodo.codigo) &&
        respuesta.pago.estado === 'en_validacion'
      ) {
        await actualizarPagoReserva(reservaId, respuesta.pago.id, { estado: 'aprobado' });
      }

      setForm(formularioTrasRegistroPago(formConTasa, fechaHoyIso(), tasaId));
      onRegistrado();
    } catch (err) {
      onError(mensajeErrorPago(err));
    } finally {
      setGuardando(false);
    }
  }

  const metodoActivo = catalogo.metodos_pago.find((m) => String(m.id) === form.metodo_pago_id);
  const formConTasaPreview = { ...form, tasa_id: form.tasa_id || (tasaId ? String(tasaId) : '') };
  const formularioValido = esFormularioPagoCompleto(
    formConTasaPreview,
    metodoActivo,
    tasaId,
    resumen,
    tasaDelDia?.valor ?? catalogo.tasa_eur_reciente?.valor,
  );
  const metodoSeleccionado = Boolean(form.metodo_pago_id);
  const puedeRegistrar =
    metodoSeleccionado && formularioValido && !guardando && resumen.saldo_pendiente_eur > 0;

  return (
    <div className="pagos-registrar">
      <div className="pagos-registrar__header">
        <h4 className="pagos-registrar__titulo">Información de pago</h4>
        <p className="pagos-registrar__subtitulo">
          Selecciona un método y registra cada cuota. Efectivo, punto y transferencia se aprueban al
          guardar; pago móvil y Zelle quedan en validación hasta revisar el comprobante.
        </p>
      </div>

      {tasaNoEsDelDia && tasaDelDia && (
        <div className="pagos-formulario__aviso" role="status">
          No hay tasa de hoy ({fechaHoyIso()}). Se usa la más reciente del{' '}
          {new Date(tasaDelDia.fecha).toLocaleDateString('es-VE')} ({tasaDelDia.valor} Bs/€).
        </div>
      )}

      {resumen.pagado_completo && (
        <div className="pagos-formulario__aviso pagos-formulario__aviso--ok" role="status">
          Esta reserva ya está pagada por completo.
        </div>
      )}

      <SelectorMetodosPago
        metodos={metodos}
        metodoSeleccionadoId={form.metodo_pago_id}
        onSeleccionar={seleccionarMetodo}
        deshabilitado={guardando || resumen.pagado_completo}
      />

      {metodoSeleccionado && !resumen.pagado_completo && (
        <>
          <FormularioPagoCampos
            form={form}
            catalogo={catalogo}
            resumen={resumen}
            tasaDelDia={tasaDelDia}
            sinTasa={sinTasaEfectiva}
            onChange={setForm}
          />

          <Boton
            variante="primario"
            tamano="md"
            anchoCompleto
            className="pagos-registrar__btn"
            onClick={guardar}
            disabled={!puedeRegistrar}
          >
            {guardando ? 'Registrando…' : '✓ Añadir pago y continuar'}
          </Boton>
        </>
      )}
    </div>
  );
}
