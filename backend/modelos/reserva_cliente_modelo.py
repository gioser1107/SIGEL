from sqlalchemy import BigInteger, Boolean, Column, DateTime, ForeignKey, Numeric, String

from database import Base

class ReservaCliente(Base):
    __tablename__ = "reserva_clientes"

    id = Column(BigInteger, primary_key=True, index=True)
    reserva_id = Column(BigInteger, ForeignKey("reservas.id"), nullable=False, index=True)
    cliente_id = Column(BigInteger, ForeignKey("clientes.id"), nullable=False, index=True)
    es_titular = Column(Boolean, nullable=False, default=False)

    es_menor = Column(Boolean, nullable=False, default=False)
    ocupa_asiento = Column(Boolean, nullable=False, default=True)
    precio_pasajero_eur = Column(Numeric(12, 2), nullable=False, default=0.00)
    recargo_eur = Column(Numeric(12, 2), nullable=False, default=0.00)
    notas_tarifa = Column(String(255), nullable=True)
    punto_recogida_id = Column(BigInteger, ForeignKey("puntos_recogida.id"), nullable=True, index=True)

    creado_en = Column(DateTime, nullable=False)
    actualizado_en = Column(DateTime, nullable=False)
    eliminado_en = Column(DateTime, nullable=True)
