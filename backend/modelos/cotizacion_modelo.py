from sqlalchemy import BigInteger, Column, DateTime, Enum, ForeignKey, Numeric, Text

from database import Base


class Cotizacion(Base):
    __tablename__ = "cotizaciones"

    id = Column(BigInteger, primary_key=True, index=True)
    cliente_id = Column(BigInteger, ForeignKey("clientes.id"), nullable=False, index=True)
    destino_id = Column(BigInteger, ForeignKey("destinos.id"), nullable=False, index=True)
    requisitos = Column(Text, nullable=True)
    precio_cotizado_eur = Column(Numeric(12, 2), nullable=True)
    valida_hasta = Column(DateTime, nullable=True)
    estado = Column(
        Enum("solicitada", "enviada", "aceptada", "vencida", "cancelada"),
        nullable=False,
        default="solicitada",
    )
    creado_en = Column(DateTime, nullable=False)
    actualizado_en = Column(DateTime, nullable=False)
    eliminado_en = Column(DateTime, nullable=True)
