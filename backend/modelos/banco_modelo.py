from sqlalchemy import BigInteger, Boolean, Column, DateTime, String

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
