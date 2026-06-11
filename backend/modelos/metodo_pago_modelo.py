from sqlalchemy import BigInteger, Column, ForeignKey, String

from database import Base

class MetodoPago(Base):
    __tablename__ = "metodos_pago"

    id = Column(BigInteger, primary_key=True, index=True)
    codigo = Column(String(40), unique=True, nullable=False)
    nombre = Column(String(120), nullable=False)
    moneda_id = Column(BigInteger, ForeignKey("monedas.id"), nullable=False, index=True)
