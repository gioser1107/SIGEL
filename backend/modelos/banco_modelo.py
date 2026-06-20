from datetime import datetime
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import BigInteger, Boolean, Column, DateTime, String
from sqlalchemy.orm import Session

from database import Base


class Banco(Base):
    __tablename__ = "bancos"

    id = Column(BigInteger, primary_key=True, index=True)
    codigo = Column(String(10), unique=True, nullable=False)
    nombre = Column(String(120), nullable=False)
    activo = Column(Boolean, nullable=False, default=True)
    creado_en = Column(DateTime, nullable=False)
    actualizado_en = Column(DateTime, nullable=False)
    eliminado_en = Column(DateTime, nullable=True)


def banco_a_dict(banco: Banco) -> dict:
    return {
        "id": banco.id,
        "codigo": banco.codigo,
        "nombre": banco.nombre,
    }


def obtener_banco_activo(db: Session, banco_id: int) -> Banco:
    banco = db.query(Banco).filter(Banco.id == banco_id, Banco.eliminado_en.is_(None)).first()
    if not banco:
        raise HTTPException(status_code=404, detail="Banco no encontrado")
    return banco


def listar_bancos(db: Session) -> list[dict]:
    bancos = (
        db.query(Banco)
        .filter(Banco.eliminado_en.is_(None))
        .order_by(Banco.nombre)
        .all()
    )
    return [banco_a_dict(b) for b in bancos]


def crear_banco(db: Session, codigo: str, nombre: str, activo: bool) -> Banco:
    codigo_limpio = codigo.strip()
    existe = db.query(Banco).filter(Banco.codigo == codigo_limpio, Banco.eliminado_en.is_(None)).first()
    if existe:
        raise HTTPException(status_code=400, detail="Ya existe un banco con ese codigo")

    ahora = datetime.now()
    nuevo = Banco(
        codigo=codigo_limpio,
        nombre=nombre.strip(),
        activo=activo,
        creado_en=ahora,
        actualizado_en=ahora,
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo


def actualizar_banco(
    db: Session,
    banco_id: int,
    codigo: Optional[str],
    nombre: Optional[str],
    activo: Optional[bool],
) -> Banco:
    banco = obtener_banco_activo(db, banco_id)

    if codigo is not None:
        codigo_limpio = codigo.strip()
        repetido = db.query(Banco).filter(
            Banco.codigo == codigo_limpio,
            Banco.id != banco_id,
            Banco.eliminado_en.is_(None),
        ).first()
        if repetido:
            raise HTTPException(status_code=400, detail="Ya existe otro banco con ese codigo")
        banco.codigo = codigo_limpio

    if nombre is not None:
        banco.nombre = nombre.strip()

    if activo is not None:
        banco.activo = activo

    banco.actualizado_en = datetime.now()
    db.commit()
    db.refresh(banco)
    return banco


def eliminar_banco(db: Session, banco_id: int) -> None:
    from modelos.pago_modelo import Pago
    from modelos.punto_venta_modelo import PuntoVenta

    banco = obtener_banco_activo(db, banco_id)

    en_punto = db.query(PuntoVenta).filter(
        PuntoVenta.banco_id == banco_id,
        PuntoVenta.eliminado_en.is_(None),
    ).first()
    if en_punto:
        raise HTTPException(status_code=400, detail="No se puede eliminar: el banco tiene puntos de venta")

    en_pago = db.query(Pago).filter(
        (Pago.banco_origen_id == banco_id) | (Pago.banco_destino_id == banco_id),
        Pago.eliminado_en.is_(None),
    ).first()
    if en_pago:
        raise HTTPException(status_code=400, detail="No se puede eliminar: el banco esta en pagos registrados")

    ahora = datetime.now()
    banco.eliminado_en = ahora
    banco.actualizado_en = ahora
    db.commit()


def validar_banco_activo(db: Session, banco_id: int) -> Banco:
    banco = db.query(Banco).filter(
        Banco.id == banco_id,
        Banco.eliminado_en.is_(None),
        Banco.activo.is_(True),
    ).first()
    if not banco:
        raise HTTPException(status_code=400, detail="Banco invalido")
    return banco
