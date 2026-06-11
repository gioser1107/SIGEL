from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, String

from database import Base

class Ciudad(Base):
    __tablename__ = "ciudades"

    id = Column(BigInteger, primary_key=True, index=True)
    estado_id = Column(BigInteger, ForeignKey("estados.id"), nullable=False, index=True)
    nombre = Column(String(120), nullable=False, index=True)
    creado_en = Column(DateTime, nullable=False)
    actualizado_en = Column(DateTime, nullable=False)
    eliminado_en = Column(DateTime, nullable=True)
