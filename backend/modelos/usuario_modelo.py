from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, String

from database import Base

class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(BigInteger, primary_key=True, index=True)
    rol_id = Column(BigInteger, ForeignKey("roles.id"), nullable=False, index=True)
    correo = Column(String(320), unique=True, nullable=False, index=True)
    hash_contrasena = Column(String(255), nullable=False)
    nombre = Column(String(80), nullable=False)
    apellido = Column(String(80), nullable=False)
    telefono = Column(String(30), nullable=True)
    creado_en = Column(DateTime, nullable=False)
    actualizado_en = Column(DateTime, nullable=False)
    eliminado_en = Column(DateTime, nullable=True)
