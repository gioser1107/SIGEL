from sqlalchemy import BigInteger, Column, String

from database import Base


class Moneda(Base):
    __tablename__ = "monedas"

    id = Column(BigInteger, primary_key=True, index=True)
    codigo = Column(String(10), unique=True, nullable=False)
    nombre = Column(String(60), nullable=False)
    simbolo = Column(String(10), nullable=False)
