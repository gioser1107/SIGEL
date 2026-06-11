from sqlalchemy import BigInteger, Boolean, Column, DateTime, ForeignKey, SmallInteger, String

from database import Base

class DestinoImagen(Base):
    __tablename__ = "destino_imagenes"

    id = Column(BigInteger, primary_key=True, index=True)
    destino_id = Column(BigInteger, ForeignKey("destinos.id"), nullable=False, index=True)
    url = Column(String(512), nullable=False)
    orden = Column(SmallInteger, nullable=False, default=0)
    es_portada = Column(Boolean, nullable=False, default=False)
    creado_en = Column(DateTime, nullable=False)
    actualizado_en = Column(DateTime, nullable=False)
    eliminado_en = Column(DateTime, nullable=True)
