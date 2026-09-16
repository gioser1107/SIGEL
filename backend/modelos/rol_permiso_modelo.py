from sqlalchemy import BigInteger, Column, DateTime

from database import Base, fk_permiso, fk_rol, tabla_seguridad

class RolPermiso(Base):
    __tablename__ = "roles_permisos"
    __table_args__ = tabla_seguridad()

    rol_id = Column(BigInteger, fk_rol(), primary_key=True)
    permiso_id = Column(BigInteger, fk_permiso(), primary_key=True)
    creado_en = Column(DateTime, nullable=False)
    actualizado_en = Column(DateTime, nullable=False)
    eliminado_en = Column(DateTime, nullable=True)
