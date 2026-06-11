from sqlalchemy import BigInteger, Column, DateTime, Enum, ForeignKey

from database import Base

class Viaje(Base):
    __tablename__ = "viajes"

    id = Column(BigInteger, primary_key=True, index=True)
    destino_id = Column(BigInteger, ForeignKey("destinos.id"), nullable=False, index=True)
    unidad_id = Column(BigInteger, ForeignKey("unidades_transporte.id"), nullable=False, index=True)
    guia_id = Column(BigInteger, ForeignKey("usuarios.id"), nullable=True, index=True)
    fecha_salida = Column(DateTime, nullable=False)
    fecha_regreso = Column(DateTime, nullable=True)
    estado = Column(
        Enum("planificado", "en_curso", "finalizado", "cancelado"),
        nullable=False,
        default="planificado",
    )
    creado_en = Column(DateTime, nullable=False)
    actualizado_en = Column(DateTime, nullable=False)
    eliminado_en = Column(DateTime, nullable=True)
