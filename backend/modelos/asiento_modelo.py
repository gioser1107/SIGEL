from sqlalchemy import BigInteger, Column, DateTime, Enum, ForeignKey, String

from database import Base


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
