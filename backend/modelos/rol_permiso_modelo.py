from sqlalchemy import BigInteger, Column, DateTime, ForeignKey

from database import Base


class RolPermiso(Base):
    __tablename__ = "roles_permisos"

    rol_id = Column(BigInteger, ForeignKey("roles.id"), primary_key=True)
    permiso_id = Column(BigInteger, ForeignKey("permisos.id"), primary_key=True)
    creado_en = Column(DateTime, nullable=False)
    actualizado_en = Column(DateTime, nullable=False)
    eliminado_en = Column(DateTime, nullable=True)
