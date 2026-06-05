from sqlalchemy import BigInteger, Boolean, Column, DateTime, Numeric, String, Text

from database import Base


class Destino(Base):
    __tablename__ = "destinos"

    id = Column(BigInteger, primary_key=True, index=True)
    nombre = Column(String(120), unique=True, nullable=False)
    descripcion = Column(Text, nullable=True)
    precio_base_eur = Column(Numeric(12, 2), nullable=False, default=0)
    activo = Column(Boolean, nullable=False, default=True)
    creado_en = Column(DateTime, nullable=False)
    actualizado_en = Column(DateTime, nullable=False)
    eliminado_en = Column(DateTime, nullable=True)
