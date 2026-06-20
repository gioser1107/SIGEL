from sqlalchemy import BigInteger, Column, DateTime, String
from sqlalchemy.orm import Session

from database import Base


class Estado(Base):
    __tablename__ = "estados"

    id = Column(BigInteger, primary_key=True, index=True)
    nombre = Column(String(100), unique=True, nullable=False, index=True)
    creado_en = Column(DateTime, nullable=False)
    actualizado_en = Column(DateTime, nullable=False)
    eliminado_en = Column(DateTime, nullable=True)


def estado_a_dict(estado: Estado) -> dict:
    return {
        "id": estado.id,
        "nombre": estado.nombre,
    }


def listar_estados(db: Session) -> list[dict]:
    estados = (
        db.query(Estado)
        .filter(Estado.eliminado_en.is_(None))
        .order_by(Estado.nombre)
        .all()
    )
    return [estado_a_dict(estado) for estado in estados]
