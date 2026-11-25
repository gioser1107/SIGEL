"""Boleto digital: se emite cuando el pago aprobado cubre el depósito mínimo."""

from __future__ import annotations

from datetime import datetime

from fastapi import HTTPException
from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Session

from database import Base
from modelos.reservas_modelo import Reserva, obtener_reserva_activa
from utilidades.ciberdefensa import (
    DocumentoAlterado,
    cargar_clave_privada,
    clave_publica_de,
    contenido_canonico,
    firmar_documento,
    huella_sha256,
    verificar_documento,
    verificar_ecdsa,
)


class Boleto(Base):
    __tablename__ = "boletos"
    __table_args__ = (UniqueConstraint("reserva_id", name="uq_boleto_reserva"),)

    id = Column(BigInteger, primary_key=True, index=True)
    reserva_id = Column(BigInteger, ForeignKey("reservas.id"), nullable=False, index=True)
    codigo = Column(String(40), nullable=False, unique=True, index=True)
    estado = Column(String(20), nullable=False, default="emitido")
    emitido_en = Column(DateTime, nullable=False)
    anulado_en = Column(DateTime, nullable=True)
    contenido_canonico = Column(Text, nullable=True)
    huella_sha256 = Column(String(64), nullable=True)
    firma_ecdsa = Column(String(256), nullable=True)
    algoritmo = Column(String(40), nullable=True)
    creado_en = Column(DateTime, nullable=False)
    actualizado_en = Column(DateTime, nullable=False)


def _momento(valor: datetime | None) -> str:
    if valor is None:
        return ""
    return valor.replace(microsecond=0).strftime("%Y-%m-%dT%H:%M:%S")


def documento_boleto(boleto: Boleto, reserva: Reserva) -> dict:
    """Datos del boleto que no pueden cambiar sin invalidar la firma."""
    return {
        "anulado_en": _momento(boleto.anulado_en),
        "cliente_id": int(reserva.cliente_id),
        "codigo": boleto.codigo,
        "emitido_en": _momento(boleto.emitido_en),
        "estado": boleto.estado,
        "reserva_id": int(reserva.id),
        "viaje_id": int(reserva.viaje_id),
    }


def aplicar_firma(boleto: Boleto, reserva: Reserva) -> None:
    firmado = firmar_documento(documento_boleto(boleto, reserva))
    boleto.contenido_canonico = firmado["contenido"]
    boleto.huella_sha256 = firmado["huella_sha256"]
    boleto.firma_ecdsa = firmado["firma_ecdsa"]
    boleto.algoritmo = firmado["algoritmo"]


def evaluar_integridad(boleto: Boleto, reserva: Reserva | None = None) -> dict:
    """Comprueba el documento guardado y, si hay reserva, los datos vivos del boleto."""
    base = {
        "algoritmo": boleto.algoritmo,
        "huella_sha256": boleto.huella_sha256,
        "valida": False,
        "motivo": "",
    }
    if not boleto.firma_ecdsa or not boleto.contenido_canonico or not boleto.huella_sha256:
        base["motivo"] = "El boleto todavía no tiene firma electrónica."
        return base

    publica = clave_publica_de(cargar_clave_privada())
    if huella_sha256(boleto.contenido_canonico) != boleto.huella_sha256:
        base["motivo"] = "La huella SHA-256 guardada no corresponde al documento firmado."
        return base
    if not verificar_ecdsa(publica, boleto.contenido_canonico.encode("utf-8"), boleto.firma_ecdsa):
        base["motivo"] = "La firma ECDSA no corresponde a este boleto. El cambio no está autorizado."
        return base

    if reserva is not None:
        campos = documento_boleto(boleto, reserva)
        if contenido_canonico(campos) != boleto.contenido_canonico:
            base["motivo"] = (
                "Los datos actuales del boleto no coinciden con el documento firmado al emitirlo."
            )
            return base
        try:
            verificar_documento(campos, boleto.huella_sha256, boleto.firma_ecdsa, publica)
        except DocumentoAlterado as error:
            base["motivo"] = str(error)
            return base

    base["valida"] = True
    return base


def boleto_a_dict(boleto: Boleto | None, reserva: Reserva | None = None) -> dict | None:
    if boleto is None:
        return None
    integridad = evaluar_integridad(boleto, reserva)
    return {
        "id": boleto.id,
        "reserva_id": boleto.reserva_id,
        "codigo": boleto.codigo,
        "estado": boleto.estado,
        "emitido_en": boleto.emitido_en.isoformat() if boleto.emitido_en else None,
        "anulado_en": boleto.anulado_en.isoformat() if boleto.anulado_en else None,
        "huella_sha256": boleto.huella_sha256,
        "algoritmo": boleto.algoritmo,
        "integridad": integridad,
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
    try:
        resumen = calcular_resumen_pagos_reserva(db, reserva)
    except ValueError:
        return None
    if not resumen.get("deposito_minimo_cumplido"):
        anular_boleto_reserva(db, reserva.id)
        return None

    if existente is not None and existente.estado == "emitido":
        if not existente.firma_ecdsa:
            aplicar_firma(existente, reserva)
            db.flush()
        return existente

    # MySQL DATETIME sin fracciones puede redondear microsegundos al guardar.
    # Firmar exactamente la precisión que se persistirá evita rechazar un
    # boleto íntegro por un segundo de diferencia después de recargarlo.
    ahora = datetime.now().replace(microsecond=0)
    if existente is not None:
        existente.estado = "emitido"
        existente.emitido_en = ahora
        existente.anulado_en = None
        existente.actualizado_en = ahora
        aplicar_firma(existente, reserva)
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
    aplicar_firma(boleto, reserva)
    db.add(boleto)
    db.flush()
    return boleto


def anular_boleto_reserva(db: Session, reserva_id: int) -> None:
    boleto = obtener_boleto_reserva(db, reserva_id)
    if boleto is None or boleto.estado == "anulado":
        return
    ahora = datetime.now().replace(microsecond=0)
    boleto.estado = "anulado"
    boleto.anulado_en = ahora
    boleto.actualizado_en = ahora
    reserva = db.query(Reserva).filter(Reserva.id == reserva_id).first()
    if reserva is not None:
        aplicar_firma(boleto, reserva)
    db.flush()


def obtener_boleto_reserva_o_error(db: Session, reserva_id: int) -> dict:
    reserva = obtener_reserva_activa(db, reserva_id)
    boleto = obtener_boleto_emitido(db, reserva_id)
    if boleto is None:
        raise HTTPException(
            status_code=404,
            detail="El boleto se emite cuando el personal aprueba el pago (depósito mínimo).",
        )
    integridad = evaluar_integridad(boleto, reserva)
    if boleto.firma_ecdsa and not integridad["valida"]:
        raise HTTPException(
            status_code=409,
            detail=integridad["motivo"] or "El boleto fue alterado y no puede usarse.",
        )
    return {"boleto": boleto_a_dict(boleto, reserva)}
