from sqlalchemy import BigInteger, Column, DateTime, String

from database import Base


class Estado(Base):
    __tablename__ = "estados"

    id = Column(BigInteger, primary_key=True, index=True)
    nombre = Column(String(100), unique=True, nullable=False, index=True)
    creado_en = Column(DateTime, nullable=False)
    actualizado_en = Column(DateTime, nullable=False)
    eliminado_en = Column(DateTime, nullable=True)
