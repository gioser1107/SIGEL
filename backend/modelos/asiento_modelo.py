from datetime import datetime
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import BigInteger, Column, DateTime, Enum, ForeignKey, String
from sqlalchemy.orm import Session

from database import Base
from utilidades.validaciones import ValidadorEntrada


class Asiento(Base):
    __tablename__ = "asientos"

    id = Column(BigInteger, primary_key=True, index=True)
    unidad_id = Column(BigInteger, ForeignKey("unidades_transporte.id"), nullable=False, index=True)
    numero = Column(String(10), nullable=False)
    posicion = Column(
        Enum("ventana", "pasillo", "medio", "otro"),
        nullable=False,
        default="otro",
    )
    creado_en = Column(DateTime, nullable=False)
    actualizado_en = Column(DateTime, nullable=False)
    eliminado_en = Column(DateTime, nullable=True)


def asiento_a_dict(asiento: Asiento) -> dict:
    return {
        "id": asiento.id,
        "unidad_id": asiento.unidad_id,
        "numero": asiento.numero,
        "posicion": asiento.posicion,
    }


def obtener_asiento_activo(db: Session, asiento_id: int) -> Asiento:
    asiento = db.query(Asiento).filter(
        Asiento.id == asiento_id,
        Asiento.eliminado_en.is_(None),
    ).first()
    if not asiento:
        raise HTTPException(status_code=404, detail="Asiento no encontrado")
    return asiento


def listar_asientos(db: Session, unidad_id: Optional[int] = None) -> list[dict]:
    consulta = db.query(Asiento).filter(Asiento.eliminado_en.is_(None))
    if unidad_id:
        consulta = consulta.filter(Asiento.unidad_id == unidad_id)
    asientos = consulta.order_by(Asiento.id).all()
    return [asiento_a_dict(a) for a in asientos]


def _validar_numero_asiento_no_repetido(
    db: Session,
    unidad_id: int,
    numero: str,
    asiento_id_actual: int | None = None,
) -> None:
    existente = db.query(Asiento).filter(
        Asiento.unidad_id == unidad_id,
        Asiento.numero == numero,
        Asiento.eliminado_en.is_(None),
    ).first()
    if existente and existente.id != asiento_id_actual:
        raise HTTPException(
            status_code=400,
            detail="Ya existe un asiento con ese número en esta unidad",
        )


def crear_asiento(
    db: Session,
    unidad_id: int,
    numero: str,
    posicion: str,
) -> Asiento:
    from modelos.unidad_transporte_modelo import UnidadTransporte

    unidad = db.query(UnidadTransporte).filter(
        UnidadTransporte.id == unidad_id,
        UnidadTransporte.eliminado_en.is_(None),
    ).first()
    if not unidad:
        raise HTTPException(
            status_code=404,
            detail="Unidad de transporte no encontrada o está eliminada",
        )

    numero_limpio = ValidadorEntrada.numero_asiento(numero)
    posicion_limpia = ValidadorEntrada.posicion_asiento(posicion)
    _validar_numero_asiento_no_repetido(db, unidad_id, numero_limpio)

    ahora = datetime.now()
    nuevo_asiento = Asiento(
        unidad_id=unidad_id,
        numero=numero_limpio,
        posicion=posicion_limpia,
        creado_en=ahora,
        actualizado_en=ahora,
    )
    db.add(nuevo_asiento)
    db.commit()
    db.refresh(nuevo_asiento)
    return nuevo_asiento


def actualizar_asiento(
    db: Session,
    asiento_id: int,
    numero: Optional[str],
    posicion: Optional[str],
) -> Asiento:
    asiento = obtener_asiento_activo(db, asiento_id)

    if numero is not None:
        numero_limpio = ValidadorEntrada.numero_asiento(numero)
        _validar_numero_asiento_no_repetido(db, asiento.unidad_id, numero_limpio, asiento_id)
        asiento.numero = numero_limpio
    if posicion is not None:
        asiento.posicion = ValidadorEntrada.posicion_asiento(posicion)

    asiento.actualizado_en = datetime.now()
    db.commit()
    return asiento


def eliminar_asiento(db: Session, asiento_id: int) -> None:
    asiento = obtener_asiento_activo(db, asiento_id)
    ahora = datetime.now()
    asiento.eliminado_en = ahora
    asiento.actualizado_en = ahora
    db.commit()
