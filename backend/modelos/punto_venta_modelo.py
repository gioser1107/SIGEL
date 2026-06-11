from sqlalchemy import BigInteger, Boolean, Column, DateTime, ForeignKey, String

from database import Base


class PuntoVenta(Base):
    __tablename__ = "puntos_venta"

    id = Column(BigInteger, primary_key=True, index=True)
    banco_id = Column(BigInteger, ForeignKey("bancos.id"), nullable=False, index=True)
    codigo = Column(String(40), unique=True, nullable=False)
    nombre = Column(String(120), nullable=False)
    numero_terminal = Column(String(60), nullable=True)
    activo = Column(Boolean, nullable=False, default=True)
    creado_en = Column(DateTime, nullable=False)
    actualizado_en = Column(DateTime, nullable=False)
    eliminado_en = Column(DateTime, nullable=True)
