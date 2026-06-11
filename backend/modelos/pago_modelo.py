from sqlalchemy import BigInteger, Column, Date, DateTime, ForeignKey, Numeric, String

from database import Base


class Pago(Base):
    __tablename__ = "pagos"

    id = Column(BigInteger, primary_key=True, index=True)
    reserva_id = Column(BigInteger, ForeignKey("reservas.id"), nullable=False, index=True)
    metodo_pago_id = Column(BigInteger, ForeignKey("metodos_pago.id"), nullable=False, index=True)
    tasa_id = Column(BigInteger, ForeignKey("tasas.id"), nullable=False, index=True)
    monto = Column(Numeric(14, 2), nullable=False)
    tipo = Column(String(20), nullable=False, default="cuota")
    estado = Column(String(20), nullable=False, default="en_validacion")
    fecha_pago = Column(Date, nullable=True)
    referencia = Column(String(120), nullable=True)
    banco_origen_id = Column(BigInteger, ForeignKey("bancos.id"), nullable=True)
    banco_destino_id = Column(BigInteger, ForeignKey("bancos.id"), nullable=True)
    punto_venta_id = Column(BigInteger, ForeignKey("puntos_venta.id"), nullable=True)
    telefono_origen = Column(String(30), nullable=True)
    correo_origen = Column(String(160), nullable=True)
    comprobante_url = Column(String(500), nullable=True)
    validado_por = Column(BigInteger, ForeignKey("usuarios.id"), nullable=True)
    validado_en = Column(DateTime, nullable=True)
    notas = Column(String(255), nullable=True)
    creado_por = Column(BigInteger, ForeignKey("usuarios.id"), nullable=True)
    creado_en = Column(DateTime, nullable=False)
    actualizado_en = Column(DateTime, nullable=False)
    eliminado_en = Column(DateTime, nullable=True)
