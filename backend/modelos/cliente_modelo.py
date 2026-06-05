from sqlalchemy import BigInteger, Column, DateTime, Enum, ForeignKey, String, Text

from database import Base


class Cliente(Base):
    __tablename__ = "clientes"

    id = Column(BigInteger, primary_key=True, index=True)
    usuario_id = Column(BigInteger, ForeignKey("usuarios.id"), nullable=False, unique=True, index=True)
    tipo_cliente = Column(Enum("natural", "juridico"), nullable=False, default="natural")
    tipo_documento = Column(Enum("V", "E", "J", "G", "P", "otro"), nullable=False, default="V")
    numero_documento = Column(String(40), nullable=False)
    nombre_completo = Column(String(160), nullable=False)
    razon_social = Column(String(160), nullable=True)
    telefono = Column(String(30), nullable=True)
    telefono_secundario = Column(String(30), nullable=True)
    direccion = Column(String(255), nullable=True)
    estado_id = Column(BigInteger, ForeignKey("estados.id"), nullable=True, index=True)
    ciudad_id = Column(BigInteger, ForeignKey("ciudades.id"), nullable=True, index=True)
    notas = Column(Text, nullable=True)
    creado_por = Column(BigInteger, ForeignKey("usuarios.id"), nullable=True)
    actualizado_por = Column(BigInteger, ForeignKey("usuarios.id"), nullable=True)
    creado_en = Column(DateTime, nullable=False)
    actualizado_en = Column(DateTime, nullable=False)
    eliminado_en = Column(DateTime, nullable=True)
