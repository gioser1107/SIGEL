from sqlalchemy import BigInteger, Column, DateTime, ForeignKey

from database import Base

class AsientoReservado(Base):
    __tablename__ = "asientos_reservados"

    id = Column(BigInteger, primary_key=True, index=True)
    reserva_cliente_id = Column(BigInteger, ForeignKey("reserva_clientes.id"), nullable=False, index=True)
    viaje_id = Column(BigInteger, ForeignKey("viajes.id"), nullable=False, index=True)
    asiento_id = Column(BigInteger, ForeignKey("asientos.id"), nullable=False, index=True)
    creado_en = Column(DateTime, nullable=False)
    actualizado_en = Column(DateTime, nullable=False)
    eliminado_en = Column(DateTime, nullable=True)
