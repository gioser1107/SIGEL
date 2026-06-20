from fastapi import HTTPException
from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, String
from sqlalchemy.orm import Session

from database import Base
from modelos.estado_modelo import Estado, estado_a_dict


class Ciudad(Base):
    __tablename__ = "ciudades"

    id = Column(BigInteger, primary_key=True, index=True)
    estado_id = Column(BigInteger, ForeignKey("estados.id"), nullable=False, index=True)
    nombre = Column(String(120), nullable=False, index=True)
    creado_en = Column(DateTime, nullable=False)
    actualizado_en = Column(DateTime, nullable=False)
    eliminado_en = Column(DateTime, nullable=True)


def ciudad_a_dict(ciudad: Ciudad) -> dict:
    return {
        "id": ciudad.id,
        "estado_id": ciudad.estado_id,
        "nombre": ciudad.nombre,
    }


def listar_ciudades_por_estado(db: Session, estado_id: int) -> dict:
    estado = db.query(Estado).filter(
        Estado.id == estado_id,
        Estado.eliminado_en.is_(None),
    ).first()
    if estado is None:
        raise HTTPException(status_code=404, detail="Estado no encontrado")

    ciudades = (
        db.query(Ciudad)
        .filter(
            Ciudad.estado_id == estado_id,
            Ciudad.eliminado_en.is_(None),
        )
        .order_by(Ciudad.nombre)
        .all()
    )

    return {
        "estado": estado_a_dict(estado),
        "ciudades": [ciudad_a_dict(ciudad) for ciudad in ciudades],
    }
