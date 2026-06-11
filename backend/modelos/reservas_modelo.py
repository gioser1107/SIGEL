from sqlalchemy import BigInteger, Column, DateTime, Enum, ForeignKey
from database import Base

class Reserva(Base):
    __tablename__ = "reservas"

    id = Column(BigInteger, primary_key=True, index=True)
    cliente_id = Column(BigInteger, ForeignKey("clientes.id"), nullable=False, index=True)
    viaje_id = Column(BigInteger, ForeignKey("viajes.id"), nullable=False, index=True)
    fecha_reserva = Column(DateTime, nullable=False)
    estado = Column(
        Enum("pendiente", "confirmada", "abonada", "cancelada"),
        nullable=False,
        default="pendiente",
    )
    creado_por = Column(BigInteger, ForeignKey("usuarios.id"), nullable=True)
    creado_en = Column(DateTime, nullable=False)
    actualizado_en = Column(DateTime, nullable=False)
    eliminado_en = Column(DateTime, nullable=True)