from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, Integer, String

from database import Base

class ViajeParadaRecogida(Base):
    __tablename__ = "viajes_paradas_recogida"

    viaje_id = Column(BigInteger, ForeignKey("viajes.id"), primary_key=True)
    orden = Column(Integer, primary_key=True)
    punto_recogida_id = Column(BigInteger, ForeignKey("puntos_recogida.id"), nullable=False, index=True)
    hora_programada = Column(DateTime, nullable=True)
    notas = Column(String(255), nullable=True)
    creado_en = Column(DateTime, nullable=False)
    actualizado_en = Column(DateTime, nullable=False)
    eliminado_en = Column(DateTime, nullable=True)
