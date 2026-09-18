"""24 h para corregir un pago rechazado; si no, se liberan los cupos."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from utilidades.politicas_agencia import HORAS_PLAZO_CORRECCION_PAGO

logger = logging.getLogger("sigel")


def actualizar_plazo_tras_pago(db: Session, reserva) -> None:
    from modelos.pago_modelo import TOLERANCIA_EUR, Pago, calcular_resumen_pagos_reserva

    if reserva.estado == "cancelada":
        reserva.plazo_correccion_hasta = None
        return

    try:
        resumen = calcular_resumen_pagos_reserva(db, reserva)
    except ValueError:
        return

    aprobado = float(resumen.get("total_pagado_aprobado_eur") or 0)
    pendiente = float(resumen.get("total_pendiente_validacion_eur") or 0)
    if aprobado > TOLERANCIA_EUR or pendiente > TOLERANCIA_EUR:
        reserva.plazo_correccion_hasta = None
        return

    ultimo_rechazado = (
        db.query(Pago)
        .filter(
            Pago.reserva_id == reserva.id,
            Pago.estado == "rechazado",
            Pago.eliminado_en.is_(None),
        )
        .order_by(Pago.validado_en.desc(), Pago.actualizado_en.desc())
        .first()
    )
    if ultimo_rechazado is None:
        reserva.plazo_correccion_hasta = None
        return

    base = ultimo_rechazado.validado_en or ultimo_rechazado.actualizado_en or datetime.now()
    reserva.plazo_correccion_hasta = base + timedelta(hours=HORAS_PLAZO_CORRECCION_PAGO)


def plazo_correccion_a_dict(reserva) -> dict | None:
    hasta = getattr(reserva, "plazo_correccion_hasta", None)
    if hasta is None:
        return None
    ahora = datetime.now()
    restante = (hasta - ahora).total_seconds()
    return {
        "hasta": hasta.isoformat(),
        "horas": HORAS_PLAZO_CORRECCION_PAGO,
        "vencido": restante <= 0,
        "minutos_restantes": max(0, int(restante // 60)),
    }


def liberar_cupos_plazo_vencido(db: Session) -> int:
    from modelos.boleto_modelo import anular_boleto_reserva
    from modelos.pago_modelo import TOLERANCIA_EUR, calcular_resumen_pagos_reserva
    from modelos.reservas_modelo import Reserva

    ahora = datetime.now()
    reservas = (
        db.query(Reserva)
        .filter(
            Reserva.eliminado_en.is_(None),
            Reserva.estado != "cancelada",
            Reserva.plazo_correccion_hasta.isnot(None),
            Reserva.plazo_correccion_hasta <= ahora,
        )
        .all()
    )
    liberadas = 0
    for reserva in reservas:
        try:
            resumen = calcular_resumen_pagos_reserva(db, reserva)
        except ValueError:
            reserva.plazo_correccion_hasta = None
            continue
        aprobado = float(resumen.get("total_pagado_aprobado_eur") or 0)
        pendiente = float(resumen.get("total_pendiente_validacion_eur") or 0)
        if aprobado > TOLERANCIA_EUR or pendiente > TOLERANCIA_EUR:
            reserva.plazo_correccion_hasta = None
            continue
        reserva.estado = "cancelada"
        reserva.plazo_correccion_hasta = None
        reserva.actualizado_en = ahora
        anular_boleto_reserva(db, reserva.id)
        liberadas += 1

    if liberadas:
        db.commit()
        logger.info("Cupos liberados por plazo de corrección vencido: %s", liberadas)
    return liberadas
