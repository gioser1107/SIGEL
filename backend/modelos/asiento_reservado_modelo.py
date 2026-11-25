from sqlalchemy import BigInteger, Column, Computed, DateTime, ForeignKey, UniqueConstraint

from database import Base


class AsientoReservado(Base):
    __tablename__ = "asientos_reservados"
    __table_args__ = (
        UniqueConstraint(
            "viaje_id",
            "asiento_activo_viaje",
            name="uq_asiento_viaje_vigente",
        ),
    )

    id = Column(BigInteger, primary_key=True, index=True)
    reserva_cliente_id = Column(BigInteger, ForeignKey("reserva_clientes.id"), nullable=False, index=True)
    viaje_id = Column(BigInteger, ForeignKey("viajes.id"), nullable=False, index=True)
    asiento_id = Column(BigInteger, ForeignKey("asientos.id"), nullable=False, index=True)
    creado_en = Column(DateTime, nullable=False)
    actualizado_en = Column(DateTime, nullable=False)
    eliminado_en = Column(DateTime, nullable=True)
    # Solo las asignaciones vigentes deben ser únicas. Las históricas pueden
    # haberse liberado dentro del mismo segundo sin entrar en conflicto.
    asiento_activo_viaje = Column(
        BigInteger,
        Computed("IF(eliminado_en IS NULL, asiento_id, NULL)", persisted=True),
    )
