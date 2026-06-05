from sqlalchemy import BigInteger, Boolean, Column, DateTime, String

from database import Base


class PuntoRecogida(Base):
    __tablename__ = "puntos_recogida"

    id = Column(BigInteger, primary_key=True, index=True)
    nombre = Column(String(120), nullable=False)
    direccion = Column(String(255), nullable=True)
    ciudad = Column(String(100), nullable=True)
    estado = Column(String(100), nullable=True)
    notas_referencia = Column(String(255), nullable=True)
    activo = Column(Boolean, nullable=False, default=True)
    creado_en = Column(DateTime, nullable=False)
    actualizado_en = Column(DateTime, nullable=False)
    eliminado_en = Column(DateTime, nullable=True)
