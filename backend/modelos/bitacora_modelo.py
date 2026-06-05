from datetime import datetime

from sqlalchemy import BigInteger, Column, DateTime, Enum, ForeignKey, JSON, String

from database import Base


class Bitacora(Base):
    __tablename__ = "bitacora"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    usuario_id = Column(BigInteger, ForeignKey("usuarios.id"), nullable=True, index=True)
    modulo = Column(
        Enum(
            "seguridad",
            "catalogo",
            "viajes",
            "reservas",
            "pagos",
            "conciliacion",
            "cotizaciones",
            "abordaje",
            "sistema",
        ),
        nullable=False,
        default="sistema",
        index=True,
    )
    accion = Column(
        Enum(
            "INSERT",
            "UPDATE",
            "DELETE",
            "LOGIN",
            "LOGOUT",
            "VALIDAR",
            "RECHAZAR",
            "ANULAR",
            "ERROR",
            "OTRO",
        ),
        nullable=False,
        default="OTRO",
        index=True,
    )
    tabla_afectada = Column(String(80), nullable=True)
    registro_id = Column(String(40), nullable=True)
    resumen = Column(String(500), nullable=False)
    detalle = Column(JSON, nullable=True)
    ip_origen = Column(String(45), nullable=True)
    creado_en = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
