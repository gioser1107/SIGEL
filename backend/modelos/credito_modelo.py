"""Saldo a favor: no hay reembolso en efectivo; el abono se reubica en otro viaje."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import Session

from database import Base, fk_usuario
from modelos.reservas_modelo import Reserva, obtener_reserva_activa
from utilidades.persistencia import _confirmar_transaccion
from utilidades.politicas_agencia import MOTIVO_CREDITO_CANCELACION

TOLERANCIA_EUR = 0.01


class CreditoCliente(Base):
    __tablename__ = "creditos_cliente"

    id = Column(BigInteger, primary_key=True, index=True)
    cliente_id = Column(BigInteger, ForeignKey("clientes.id"), nullable=False, index=True)
    reserva_origen_id = Column(BigInteger, ForeignKey("reservas.id"), nullable=True, index=True)
    monto_eur = Column(Numeric(12, 2), nullable=False)
    saldo_restante_eur = Column(Numeric(12, 2), nullable=False)
    motivo = Column(String(80), nullable=False, default=MOTIVO_CREDITO_CANCELACION)
    notas = Column(String(255), nullable=True)
    creado_por = Column(BigInteger, fk_usuario(), nullable=True)
    creado_en = Column(DateTime, nullable=False)
    actualizado_en = Column(DateTime, nullable=False)
    eliminado_en = Column(DateTime, nullable=True)


class CreditoAplicado(Base):
    __tablename__ = "creditos_aplicados"

    id = Column(BigInteger, primary_key=True, index=True)
    credito_id = Column(BigInteger, ForeignKey("creditos_cliente.id"), nullable=False, index=True)
    reserva_destino_id = Column(BigInteger, ForeignKey("reservas.id"), nullable=False, index=True)
    monto_eur = Column(Numeric(12, 2), nullable=False)
    creado_por = Column(BigInteger, fk_usuario(), nullable=True)
    creado_en = Column(DateTime, nullable=False)


def _redondear(valor: float) -> float:
    return round(float(valor), 2)


def credito_a_dict(credito: CreditoCliente) -> dict:
    return {
        "id": credito.id,
        "cliente_id": credito.cliente_id,
        "reserva_origen_id": credito.reserva_origen_id,
        "monto_eur": float(credito.monto_eur),
        "saldo_restante_eur": float(credito.saldo_restante_eur),
        "motivo": credito.motivo,
        "notas": credito.notas,
        "creado_en": credito.creado_en.isoformat() if credito.creado_en else None,
    }


def total_credito_aplicado_reserva(db: Session, reserva_id: int) -> float:
    filas = (
        db.query(CreditoAplicado)
        .filter(CreditoAplicado.reserva_destino_id == reserva_id)
        .all()
    )
    return _redondear(sum(float(f.monto_eur) for f in filas))


def saldo_disponible_cliente(db: Session, cliente_id: int) -> float:
    filas = (
        db.query(CreditoCliente)
        .filter(
            CreditoCliente.cliente_id == cliente_id,
            CreditoCliente.eliminado_en.is_(None),
        )
        .all()
    )
    return _redondear(sum(float(c.saldo_restante_eur) for c in filas if float(c.saldo_restante_eur) > 0))


def listar_creditos_cliente(db: Session, cliente_id: int) -> dict:
    filas = (
        db.query(CreditoCliente)
        .filter(
            CreditoCliente.cliente_id == cliente_id,
            CreditoCliente.eliminado_en.is_(None),
        )
        .order_by(CreditoCliente.creado_en.desc())
        .all()
    )
    items = [credito_a_dict(c) for c in filas]
    return {
        "cliente_id": cliente_id,
        "saldo_disponible_eur": saldo_disponible_cliente(db, cliente_id),
        "creditos": items,
        "politica": "No hay reembolso en efectivo. El saldo aprobado se conserva a favor para reubicar en un viaje futuro.",
    }


def listar_creditos_admin(db: Session, cliente_id: int | None = None) -> dict:
    consulta = db.query(CreditoCliente).filter(CreditoCliente.eliminado_en.is_(None))
    if cliente_id is not None:
        consulta = consulta.filter(CreditoCliente.cliente_id == cliente_id)
    filas = consulta.order_by(CreditoCliente.creado_en.desc()).all()
    return {"items": [credito_a_dict(c) for c in filas]}


def registrar_credito_cancelacion(
    db: Session,
    cliente_id: int,
    reserva_origen_id: int,
    monto_eur: float,
    usuario_id: int | None,
    notas: str | None = None,
) -> CreditoCliente | None:
    monto = _redondear(monto_eur)
    if monto <= TOLERANCIA_EUR:
        return None

    ahora = datetime.now()
    credito = CreditoCliente(
        cliente_id=cliente_id,
        reserva_origen_id=reserva_origen_id,
        monto_eur=Decimal(str(monto)),
        saldo_restante_eur=Decimal(str(monto)),
        motivo=MOTIVO_CREDITO_CANCELACION,
        notas=(notas or "Cancelación sin reembolso. Saldo a favor para reubicación.")[:255],
        creado_por=usuario_id,
        creado_en=ahora,
        actualizado_en=ahora,
    )
    db.add(credito)
    db.flush()
    return credito


def aplicar_credito_a_reserva(
    db: Session,
    reserva_id: int,
    cliente_id: int,
    usuario_id: int | None,
    monto_eur: float | None = None,
) -> dict:
    from modelos.pago_modelo import calcular_resumen_pagos_reserva

    reserva = obtener_reserva_activa(db, reserva_id)
    if reserva.cliente_id != cliente_id:
        raise HTTPException(status_code=403, detail="El saldo a favor solo aplica al titular de la reserva")
    if reserva.estado == "cancelada":
        raise HTTPException(status_code=400, detail="No se puede aplicar saldo a una reserva cancelada")

    resumen = calcular_resumen_pagos_reserva(db, reserva)
    pendiente = float(resumen["saldo_pendiente_eur"])
    disponible = saldo_disponible_cliente(db, cliente_id)

    if pendiente <= TOLERANCIA_EUR:
        raise HTTPException(status_code=400, detail="Esta reserva no tiene saldo pendiente")
    if disponible <= TOLERANCIA_EUR:
        raise HTTPException(status_code=400, detail="El cliente no tiene saldo a favor disponible")

    solicitado = pendiente if monto_eur is None else _redondear(monto_eur)
    if solicitado <= TOLERANCIA_EUR:
        raise HTTPException(status_code=400, detail="El monto a aplicar debe ser mayor a cero")

    a_aplicar = min(solicitado, pendiente, disponible)
    restante = a_aplicar
    ahora = datetime.now()

    creditos = (
        db.query(CreditoCliente)
        .filter(
            CreditoCliente.cliente_id == cliente_id,
            CreditoCliente.eliminado_en.is_(None),
            CreditoCliente.saldo_restante_eur > 0,
        )
        .order_by(CreditoCliente.creado_en.asc())
        .all()
    )

    aplicados = []
    for credito in creditos:
        if restante <= TOLERANCIA_EUR:
            break
        disponible_credito = float(credito.saldo_restante_eur)
        toma = min(disponible_credito, restante)
        credito.saldo_restante_eur = Decimal(str(_redondear(disponible_credito - toma)))
        credito.actualizado_en = ahora
        db.add(
            CreditoAplicado(
                credito_id=credito.id,
                reserva_destino_id=reserva.id,
                monto_eur=Decimal(str(_redondear(toma))),
                creado_por=usuario_id,
                creado_en=ahora,
            )
        )
        aplicados.append({"credito_id": credito.id, "monto_eur": _redondear(toma)})
        restante = _redondear(restante - toma)

    _confirmar_transaccion(db)
    resumen_nuevo = calcular_resumen_pagos_reserva(db, reserva)
    return {
        "mensaje": "Saldo a favor aplicado. No hay reembolso en efectivo; el crédito se descuenta de esta reserva.",
        "aplicado_eur": _redondear(a_aplicar - restante),
        "detalle": aplicados,
        "saldo_disponible_eur": saldo_disponible_cliente(db, cliente_id),
        "resumen_pagos": resumen_nuevo,
    }
