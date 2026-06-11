from datetime import date

from sqlalchemy.orm import Session

from modelos.banco_modelo import Banco
from modelos.destino_modelo import Destino
from modelos.metodo_pago_modelo import MetodoPago
from modelos.moneda_modelo import Moneda
from modelos.pago_modelo import Pago
from modelos.punto_venta_modelo import PuntoVenta
from modelos.reserva_cliente_modelo import ReservaCliente
from modelos.reservas_modelo import Reserva
from modelos.tasa_modelo import Tasa
from modelos.viaje_modelo import Viaje


def moneda_a_dict(moneda: Moneda) -> dict:
    return {
        "id": moneda.id,
        "codigo": moneda.codigo,
        "nombre": moneda.nombre,
        "simbolo": moneda.simbolo,
    }


def metodo_pago_a_dict(metodo: MetodoPago, moneda: Moneda) -> dict:
    return {
        "id": metodo.id,
        "codigo": metodo.codigo,
        "nombre": metodo.nombre,
        "moneda": moneda_a_dict(moneda),
    }


def banco_a_dict(banco: Banco) -> dict:
    return {
        "id": banco.id,
        "codigo": banco.codigo,
        "nombre": banco.nombre,
    }


def punto_venta_a_dict(punto: PuntoVenta) -> dict:
    return {
        "id": punto.id,
        "banco_id": punto.banco_id,
        "codigo": punto.codigo,
        "nombre": punto.nombre,
        "numero_terminal": punto.numero_terminal,
    }


def tasa_a_dict(tasa: Tasa, moneda: Moneda) -> dict:
    return {
        "id": tasa.id,
        "fecha": tasa.fecha.isoformat() if tasa.fecha else None,
        "valor": float(tasa.valor),
        "moneda": moneda_a_dict(moneda),
    }


def pago_a_dict(
    pago: Pago,
    metodo: MetodoPago,
    moneda: Moneda,
    tasa: Tasa,
    moneda_tasa: Moneda,
    banco_origen: Banco | None = None,
    banco_destino: Banco | None = None,
    punto_venta: PuntoVenta | None = None,
) -> dict:
    resultado = {
        "id": pago.id,
        "reserva_id": pago.reserva_id,
        "metodo_pago": metodo_pago_a_dict(metodo, moneda),
        "tasa": tasa_a_dict(tasa, moneda_tasa),
        "monto": float(pago.monto),
        "tipo": pago.tipo,
        "estado": pago.estado,
        "fecha_pago": pago.fecha_pago.isoformat() if pago.fecha_pago else None,
        "referencia": pago.referencia,
        "banco_origen": banco_a_dict(banco_origen) if banco_origen else None,
        "banco_destino": banco_a_dict(banco_destino) if banco_destino else None,
        "punto_venta": punto_venta_a_dict(punto_venta) if punto_venta else None,
        "telefono_origen": pago.telefono_origen,
        "correo_origen": pago.correo_origen,
        "comprobante_url": pago.comprobante_url,
        "validado_por": pago.validado_por,
        "validado_en": pago.validado_en,
        "notas": pago.notas,
        "creado_por": pago.creado_por,
        "creado_en": pago.creado_en,
        "actualizado_en": pago.actualizado_en,
    }
    return resultado


def buscar_moneda_por_id(db: Session, moneda_id: int) -> Moneda | None:
    return db.query(Moneda).filter(Moneda.id == moneda_id).first()


def buscar_moneda_por_codigo(db: Session, codigo: str) -> Moneda | None:
    return db.query(Moneda).filter(Moneda.codigo == codigo).first()


def obtener_tasa_eur_reciente(db: Session) -> tuple[Tasa, Moneda] | None:
    moneda_eur = buscar_moneda_por_codigo(db, "EUR")
    if not moneda_eur:
        return None

    tasa = (
        db.query(Tasa)
        .filter(Tasa.moneda_id == moneda_eur.id)
        .order_by(Tasa.fecha.desc(), Tasa.id.desc())
        .first()
    )
    if not tasa:
        return None

    return tasa, moneda_eur


def obtener_tasa_eur_del_dia(db: Session) -> dict | None:
    """Tasa EUR de hoy; si no hay, usa la mas reciente."""
    moneda_eur = buscar_moneda_por_codigo(db, "EUR")
    if not moneda_eur:
        return None

    hoy = date.today()
    tasa_hoy = (
        db.query(Tasa)
        .filter(Tasa.moneda_id == moneda_eur.id, Tasa.fecha == hoy)
        .order_by(Tasa.id.desc())
        .first()
    )

    if tasa_hoy:
        return {
            "tasa": tasa_a_dict(tasa_hoy, moneda_eur),
            "fecha": hoy.isoformat(),
            "valor": float(tasa_hoy.valor),
            "es_del_dia": True,
        }

    tasa_reciente = obtener_tasa_eur_reciente(db)
    if not tasa_reciente:
        return None

    tasa, moneda = tasa_reciente
    return {
        "tasa": tasa_a_dict(tasa, moneda),
        "fecha": tasa.fecha.isoformat() if tasa.fecha else None,
        "valor": float(tasa.valor),
        "es_del_dia": False,
    }


def cargar_datos_pago(
    db: Session,
    pago: Pago,
) -> dict:
    metodo = db.query(MetodoPago).filter(MetodoPago.id == pago.metodo_pago_id).first()
    if not metodo:
        raise ValueError("Metodo de pago no encontrado")

    moneda = buscar_moneda_por_id(db, metodo.moneda_id)
    if not moneda:
        raise ValueError("Moneda del metodo de pago no encontrada")

    tasa = db.query(Tasa).filter(Tasa.id == pago.tasa_id).first()
    if not tasa:
        raise ValueError("Tasa no encontrada")

    moneda_tasa = buscar_moneda_por_id(db, tasa.moneda_id)
    if not moneda_tasa:
        raise ValueError("Moneda de la tasa no encontrada")

    banco_origen = None
    if pago.banco_origen_id:
        banco_origen = db.query(Banco).filter(Banco.id == pago.banco_origen_id).first()

    banco_destino = None
    if pago.banco_destino_id:
        banco_destino = db.query(Banco).filter(Banco.id == pago.banco_destino_id).first()

    punto_venta = None
    if pago.punto_venta_id:
        punto_venta = db.query(PuntoVenta).filter(PuntoVenta.id == pago.punto_venta_id).first()

    return pago_a_dict(
        pago,
        metodo,
        moneda,
        tasa,
        moneda_tasa,
        banco_origen,
        banco_destino,
        punto_venta,
    )


def _redondear_eur(valor: float) -> float:
    return round(valor, 2)


def calcular_total_reserva_eur(db: Session, reserva: Reserva) -> dict:
    viaje = (
        db.query(Viaje)
        .filter(Viaje.id == reserva.viaje_id, Viaje.eliminado_en.is_(None))
        .first()
    )
    if not viaje:
        raise ValueError("Viaje de la reserva no encontrado")

    destino = (
        db.query(Destino)
        .filter(Destino.id == viaje.destino_id, Destino.eliminado_en.is_(None))
        .first()
    )
    if not destino:
        raise ValueError("Destino del viaje no encontrado")

    pasajeros = (
        db.query(ReservaCliente)
        .filter(
            ReservaCliente.reserva_id == reserva.id,
            ReservaCliente.eliminado_en.is_(None),
        )
        .all()
    )

    cantidad_pasajeros = len(pasajeros)
    precio_unitario_eur = float(destino.precio_base_eur or 0)
    recargos_eur = sum(float(p.recargo_eur or 0) for p in pasajeros)

    total_reserva_eur = 0.0
    pasajeros_con_tarifa_custom = 0

    for pasajero in pasajeros:
        precio_linea = float(pasajero.precio_pasajero_eur or 0)
        if precio_linea > 0:
            pasajeros_con_tarifa_custom += 1
        else:
            precio_linea = precio_unitario_eur
        total_reserva_eur += precio_linea + float(pasajero.recargo_eur or 0)

    if cantidad_pasajeros == 0:
        origen_total = "destino"
    elif pasajeros_con_tarifa_custom == cantidad_pasajeros:
        origen_total = "pasajeros"
    elif pasajeros_con_tarifa_custom > 0:
        origen_total = "mixto"
    else:
        origen_total = "destino"

    return {
        "viaje_id": viaje.id,
        "destino_id": destino.id,
        "destino_nombre": destino.nombre,
        "precio_unitario_eur": _redondear_eur(precio_unitario_eur),
        "cantidad_pasajeros": cantidad_pasajeros,
        "recargos_eur": _redondear_eur(recargos_eur),
        "total_reserva_eur": _redondear_eur(total_reserva_eur),
        "origen_total": origen_total,
    }


def convertir_monto_pago_a_eur(db: Session, pago: Pago) -> tuple[float, bool]:
    metodo = db.query(MetodoPago).filter(MetodoPago.id == pago.metodo_pago_id).first()
    if not metodo:
        return 0.0, False

    moneda = buscar_moneda_por_id(db, metodo.moneda_id)
    if not moneda:
        return 0.0, False

    tasa = db.query(Tasa).filter(Tasa.id == pago.tasa_id).first()
    if not tasa:
        return 0.0, False

    moneda_tasa = buscar_moneda_por_id(db, tasa.moneda_id)
    if not moneda_tasa:
        return 0.0, False

    monto = float(pago.monto)

    if moneda.codigo == "EUR":
        return _redondear_eur(monto), False

    if moneda.codigo == "VES" and moneda_tasa.codigo == "EUR":
        valor_eur = float(tasa.valor)
        if valor_eur <= 0:
            return 0.0, False
        return _redondear_eur(monto / valor_eur), False

    if moneda.codigo == "USD":
        moneda_usd = buscar_moneda_por_codigo(db, "USD")
        tasa_usd = None
        if moneda_usd:
            tasa_usd = (
                db.query(Tasa)
                .filter(Tasa.moneda_id == moneda_usd.id)
                .order_by(Tasa.fecha.desc(), Tasa.id.desc())
                .first()
            )

        tasa_eur = tasa if moneda_tasa.codigo == "EUR" else None
        if not tasa_eur:
            tasa_eur_resultado = obtener_tasa_eur_reciente(db)
            tasa_eur = tasa_eur_resultado[0] if tasa_eur_resultado else None

        if tasa_usd and tasa_eur:
            valor_usd = float(tasa_usd.valor)
            valor_eur = float(tasa_eur.valor)
            if valor_usd > 0 and valor_eur > 0:
                return _redondear_eur((monto * valor_usd) / valor_eur), False

        return _redondear_eur(monto), True

    return _redondear_eur(monto), True


def calcular_resumen_pagos_reserva(db: Session, reserva: Reserva) -> dict:
    info_reserva = calcular_total_reserva_eur(db, reserva)

    pagos = (
        db.query(Pago)
        .filter(Pago.reserva_id == reserva.id, Pago.eliminado_en.is_(None))
        .order_by(Pago.creado_en.asc())
        .all()
    )

    total_aprobado_eur = 0.0
    total_en_validacion_eur = 0.0
    total_rechazado_eur = 0.0
    cantidad_aprobados = 0
    cantidad_en_validacion = 0
    cantidad_rechazados = 0

    for pago in pagos:
        monto_eur, _ = convertir_monto_pago_a_eur(db, pago)
        if pago.estado == "aprobado":
            total_aprobado_eur += monto_eur
            cantidad_aprobados += 1
        elif pago.estado == "en_validacion":
            total_en_validacion_eur += monto_eur
            cantidad_en_validacion += 1
        elif pago.estado == "rechazado":
            total_rechazado_eur += monto_eur
            cantidad_rechazados += 1

    total_reserva_eur = info_reserva["total_reserva_eur"]
    saldo_pendiente_eur = _redondear_eur(max(total_reserva_eur - total_aprobado_eur, 0))
    pagado_completo = saldo_pendiente_eur <= 0 and total_reserva_eur > 0

    return {
        "reserva_id": reserva.id,
        "estado_reserva": reserva.estado,
        "destino": {
            "id": info_reserva["destino_id"],
            "nombre": info_reserva["destino_nombre"],
            "precio_unitario_eur": info_reserva["precio_unitario_eur"],
        },
        "cantidad_pasajeros": info_reserva["cantidad_pasajeros"],
        "recargos_eur": info_reserva["recargos_eur"],
        "total_reserva_eur": total_reserva_eur,
        "origen_total": info_reserva["origen_total"],
        "total_pagado_aprobado_eur": _redondear_eur(total_aprobado_eur),
        "total_pendiente_validacion_eur": _redondear_eur(total_en_validacion_eur),
        "total_rechazado_eur": _redondear_eur(total_rechazado_eur),
        "saldo_pendiente_eur": saldo_pendiente_eur,
        "pagado_completo": pagado_completo,
        "cantidad_pagos": len(pagos),
        "cantidad_aprobados": cantidad_aprobados,
        "cantidad_en_validacion": cantidad_en_validacion,
        "cantidad_rechazados": cantidad_rechazados,
    }


def actualizar_estado_reserva_por_pagos(db: Session, reserva: Reserva) -> None:
    if reserva.estado == "cancelada":
        return

    resumen = calcular_resumen_pagos_reserva(db, reserva)

    if resumen["pagado_completo"] and resumen["total_reserva_eur"] > 0:
        reserva.estado = "abonada"
    elif resumen["total_pagado_aprobado_eur"] > 0:
        reserva.estado = "confirmada"
    elif reserva.estado in ("abonada", "confirmada"):
        reserva.estado = "pendiente"

