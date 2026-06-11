from sqlalchemy import BigInteger, Column, DateTime, Integer, String

from database import Base

class UnidadTransporte(Base):
    __tablename__ = "unidades_transporte"

    id = Column(BigInteger, primary_key=True, index=True)
    placa = Column(String(16), unique=True, nullable=False)
    modelo = Column(String(80), nullable=True)
    capacidad = Column(Integer, nullable=False)
    creado_en = Column(DateTime, nullable=False)
    actualizado_en = Column(DateTime, nullable=False)
    eliminado_en = Column(DateTime, nullable=True)
