from datetime import datetime
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import BigInteger, Boolean, Column, DateTime, ForeignKey, String
from sqlalchemy.orm import Session

from database import Base
from modelos.banco_modelo import Banco, banco_a_dict, validar_banco_activo


class PuntoVenta(Base):
    __tablename__ = "puntos_venta"

    id = Column(BigInteger, primary_key=True, index=True)
    banco_id = Column(BigInteger, ForeignKey("bancos.id"), nullable=False, index=True)
    codigo = Column(String(40), unique=True, nullable=False)
    nombre = Column(String(120), nullable=False)
    numero_terminal = Column(String(60), nullable=True)
    activo = Column(Boolean, nullable=False, default=True)
    creado_en = Column(DateTime, nullable=False)
    actualizado_en = Column(DateTime, nullable=False)
    eliminado_en = Column(DateTime, nullable=True)


def punto_venta_a_dict(punto: PuntoVenta) -> dict:
    return {
        "id": punto.id,
        "banco_id": punto.banco_id,
        "codigo": punto.codigo,
        "nombre": punto.nombre,
        "numero_terminal": punto.numero_terminal,
    }


def obtener_punto_venta_activo(db: Session, punto_id: int) -> PuntoVenta:
    punto = db.query(PuntoVenta).filter(
        PuntoVenta.id == punto_id,
        PuntoVenta.eliminado_en.is_(None),
    ).first()
    if not punto:
        raise HTTPException(status_code=404, detail="Punto de venta no encontrado")
    return punto


def punto_venta_a_respuesta(db: Session, punto: PuntoVenta) -> dict:
    resultado = punto_venta_a_dict(punto)
    banco = db.query(Banco).filter(Banco.id == punto.banco_id).first()
    if banco:
        resultado["banco"] = banco_a_dict(banco)
    return resultado


def listar_puntos_venta(db: Session, banco_id: Optional[int] = None) -> list[dict]:
    consulta = db.query(PuntoVenta).filter(PuntoVenta.eliminado_en.is_(None))
    if banco_id is not None:
        consulta = consulta.filter(PuntoVenta.banco_id == banco_id)

    puntos = consulta.order_by(PuntoVenta.nombre).all()
    return [punto_venta_a_respuesta(db, p) for p in puntos]


def crear_punto_venta(
    db: Session,
    banco_id: int,
    codigo: str,
    nombre: str,
    numero_terminal: Optional[str],
    activo: bool,
) -> PuntoVenta:
    validar_banco_activo(db, banco_id)
    codigo_limpio = codigo.strip()
    existe = db.query(PuntoVenta).filter(
        PuntoVenta.codigo == codigo_limpio,
        PuntoVenta.eliminado_en.is_(None),
    ).first()
    if existe:
        raise HTTPException(status_code=400, detail="Ya existe un punto de venta con ese codigo")

    ahora = datetime.now()
    nuevo = PuntoVenta(
        banco_id=banco_id,
        codigo=codigo_limpio,
        nombre=nombre.strip(),
        numero_terminal=numero_terminal,
        activo=activo,
        creado_en=ahora,
        actualizado_en=ahora,
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo


def actualizar_punto_venta(
    db: Session,
    punto_id: int,
    banco_id: Optional[int],
    codigo: Optional[str],
    nombre: Optional[str],
    numero_terminal: Optional[str],
    activo: Optional[bool],
) -> PuntoVenta:
    punto = obtener_punto_venta_activo(db, punto_id)

    if banco_id is not None:
        validar_banco_activo(db, banco_id)
        punto.banco_id = banco_id

    if codigo is not None:
        codigo_limpio = codigo.strip()
        repetido = db.query(PuntoVenta).filter(
            PuntoVenta.codigo == codigo_limpio,
            PuntoVenta.id != punto_id,
            PuntoVenta.eliminado_en.is_(None),
        ).first()
        if repetido:
            raise HTTPException(status_code=400, detail="Ya existe otro punto de venta con ese codigo")
        punto.codigo = codigo_limpio

    if nombre is not None:
        punto.nombre = nombre.strip()

    if numero_terminal is not None:
        punto.numero_terminal = numero_terminal

    if activo is not None:
        punto.activo = activo

    punto.actualizado_en = datetime.now()
    db.commit()
    db.refresh(punto)
    return punto


def eliminar_punto_venta(db: Session, punto_id: int) -> None:
    from modelos.pago_modelo import Pago

    punto = obtener_punto_venta_activo(db, punto_id)
    en_pago = db.query(Pago).filter(Pago.punto_venta_id == punto_id, Pago.eliminado_en.is_(None)).first()
    if en_pago:
        raise HTTPException(status_code=400, detail="No se puede eliminar: el punto de venta tiene pagos registrados")

    ahora = datetime.now()
    punto.eliminado_en = ahora
    punto.actualizado_en = ahora
    db.commit()
