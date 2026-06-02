from sqlalchemy import Column, BigInteger, DateTime, String, Text

from database import Base


class Rol(Base):
    __tablename__ = "roles"

    id = Column(BigInteger, primary_key=True, index=True)
    nombre = Column(String(50), unique=True, nullable=False)
    descripcion = Column(Text, nullable=True)
    creado_en = Column(DateTime, nullable=False)
    actualizado_en = Column(DateTime, nullable=False)
    eliminado_en = Column(DateTime, nullable=True)
