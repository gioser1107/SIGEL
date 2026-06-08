from sqlalchemy import BigInteger, Column, DateTime, Enum, ForeignKey, String

from database import Base


class AbordajeViaje(Base):
    __tablename__ = "abordajes_viaje"

    id = Column(BigInteger, primary_key=True, index=True)
    reserva_cliente_id = Column(BigInteger, ForeignKey("reserva_clientes.id"), nullable=False, index=True)
    abordado_en = Column(DateTime, nullable=False)
    registrado_por = Column(BigInteger, ForeignKey("usuarios.id"), nullable=True, index=True)
    estado = Column(
        Enum("abordado", "no_presentado"),
        nullable=False,
        default="abordado",
    )
    notas = Column(String(255), nullable=True)
    creado_en = Column(DateTime, nullable=False)
    actualizado_en = Column(DateTime, nullable=False)
    eliminado_en = Column(DateTime, nullable=True)
