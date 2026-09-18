"""Boleto digital: se emite cuando el pago aprobado cubre el depósito mínimo."""

from __future__ import annotations

from datetime import datetime

from fastapi import HTTPException
from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Session

from database import Base
from modelos.reservas_modelo import Reserva, obtener_reserva_activa


class Boleto(Base):
    __tablename__ = "boletos"
    __table_args__ = (UniqueConstraint("reserva_id", name="uq_boleto_reserva"),)

    id = Column(BigInteger, primary_key=True, index=True)
    reserva_id = Column(BigInteger, ForeignKey("reservas.id"), nullable=False, index=True)
    codigo = Column(String(40), nullable=False, unique=True, index=True)
    estado = Column(String(20), nullable=False, default="emitido")
    emitido_en = Column(DateTime, nullable=False)
    anulado_en = Column(DateTime, nullable=True)
    creado_en = Column(DateTime, nullable=False)
    actualizado_en = Column(DateTime, nullable=False)


def boleto_a_dict(boleto: Boleto | None) -> dict | None:
    if boleto is None:
        return None
    return {
        "id": boleto.id,
        "reserva_id": boleto.reserva_id,
        "codigo": boleto.codigo,
        "estado": boleto.estado,
        "emitido_en": boleto.emitido_en.isoformat() if boleto.emitido_en else None,
        "anulado_en": boleto.anulado_en.isoformat() if boleto.anulado_en else None,
    }


def _codigo_boleto(reserva_id: int) -> str:
    return f"TBQ-{reserva_id:06d}"


def obtener_boleto_reserva(db: Session, reserva_id: int) -> Boleto | None:
    return (
        db.query(Boleto)
        .filter(Boleto.reserva_id == reserva_id)
        .order_by(Boleto.id.desc())
        .first()
    )


def obtener_boleto_emitido(db: Session, reserva_id: int) -> Boleto | None:
    boleto = obtener_boleto_reserva(db, reserva_id)
    if boleto is None or boleto.estado != "emitido":
        return None
    return boleto


def emitir_boleto_si_corresponde(db: Session, reserva: Reserva) -> Boleto | None:
    from modelos.pago_modelo import calcular_resumen_pagos_reserva

    if reserva.estado == "cancelada":
        anular_boleto_reserva(db, reserva.id)
        return None

    existente = obtener_boleto_reserva(db, reserva.id)
    if existente is not None and existente.estado == "emitido":
        return existente

    try:
        resumen = calcular_resumen_pagos_reserva(db, reserva)
    except ValueError:
        return None
    if not resumen.get("deposito_minimo_cumplido"):
        return None

    ahora = datetime.now()
    if existente is not None:
        existente.estado = "emitido"
        existente.emitido_en = ahora
        existente.anulado_en = None
        existente.actualizado_en = ahora
        db.flush()
        return existente

    boleto = Boleto(
        reserva_id=reserva.id,
        codigo=_codigo_boleto(reserva.id),
        estado="emitido",
        emitido_en=ahora,
        creado_en=ahora,
        actualizado_en=ahora,
    )
    db.add(boleto)
    db.flush()
    return boleto


def anular_boleto_reserva(db: Session, reserva_id: int) -> None:
    boleto = obtener_boleto_reserva(db, reserva_id)
    if boleto is None or boleto.estado == "anulado":
        return
    ahora = datetime.now()
    boleto.estado = "anulado"
    boleto.anulado_en = ahora
    boleto.actualizado_en = ahora
    db.flush()


def obtener_boleto_reserva_o_error(db: Session, reserva_id: int) -> dict:
    obtener_reserva_activa(db, reserva_id)
    boleto = obtener_boleto_emitido(db, reserva_id)
    if boleto is None:
        raise HTTPException(
            status_code=404,
            detail="El boleto se emite cuando el personal aprueba el pago (depósito mínimo).",
        )
    return {"boleto": boleto_a_dict(boleto)}
