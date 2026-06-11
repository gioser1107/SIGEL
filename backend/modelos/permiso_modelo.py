from sqlalchemy import BigInteger, Column, DateTime, Text

from database import Base

class Permiso(Base):
    __tablename__ = "permisos"

    id = Column(BigInteger, primary_key=True, index=True)
    descripcion = Column(Text, nullable=True)
    creado_en = Column(DateTime, nullable=False)
    actualizado_en = Column(DateTime, nullable=False)
    eliminado_en = Column(DateTime, nullable=True)
