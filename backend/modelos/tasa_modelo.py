from sqlalchemy import BigInteger, Column, Date, ForeignKey, Numeric

from database import Base


class Tasa(Base):
    __tablename__ = "tasas"

    id = Column(BigInteger, primary_key=True, index=True)
    fecha = Column(Date, nullable=False, index=True)
    valor = Column(Numeric(14, 4), nullable=False)
    moneda_id = Column(BigInteger, ForeignKey("monedas.id"), nullable=False, index=True)
