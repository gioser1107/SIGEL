from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, String, Text

from database import Base

class Cliente(Base):
    __tablename__ = "clientes"

    id = Column(BigInteger, primary_key=True, index=True)
    usuario_id = Column(BigInteger, ForeignKey("usuarios.id"), nullable=True, unique=True, index=True)
    tipo_cliente = Column(String(20), nullable=False)
    tipo_documento = Column(String(20), nullable=False)
    numero_documento = Column(String(40), nullable=False, index=True)
    nombre = Column(String(80), nullable=False)
    apellido = Column(String(80), nullable=False)
    razon_social = Column(String(160), nullable=True)
    telefono = Column(String(30), nullable=True)
    telefono_secundario = Column(String(30), nullable=True)
    direccion = Column(String(255), nullable=True)
    ciudad_id = Column(BigInteger, ForeignKey("ciudades.id"), nullable=True, index=True)
    estado_id = Column(BigInteger, ForeignKey("estados.id"), nullable=True, index=True)
    notas = Column(Text, nullable=True)
    creado_por = Column(BigInteger, ForeignKey("usuarios.id"), nullable=True, index=True)
    actualizado_por = Column(BigInteger, ForeignKey("usuarios.id"), nullable=True, index=True)
    creado_en = Column(DateTime, nullable=False)
    actualizado_en = Column(DateTime, nullable=False)
    eliminado_en = Column(DateTime, nullable=True)
