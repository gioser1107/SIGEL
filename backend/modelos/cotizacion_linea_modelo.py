from sqlalchemy import BigInteger, Column, DateTime, Enum, ForeignKey, Numeric, String

from database import Base


class CotizacionLinea(Base):
    __tablename__ = "cotizacion_lineas"

    id = Column(BigInteger, primary_key=True, index=True)
    cotizacion_id = Column(BigInteger, ForeignKey("cotizaciones.id"), nullable=False, index=True)
    categoria = Column(
        Enum("combustible", "logistica", "pago_guia", "alimentacion", "peajes", "otro"),
        nullable=False,
        default="otro",
    )
    monto_eur = Column(Numeric(12, 2), nullable=False)
    descripcion = Column(String(255), nullable=True)
    creado_en = Column(DateTime, nullable=False)
    actualizado_en = Column(DateTime, nullable=False)
    eliminado_en = Column(DateTime, nullable=True)
