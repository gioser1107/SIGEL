from datetime import datetime

from fastapi import HTTPException
from sqlalchemy import BigInteger, Column, DateTime, String, Text
from sqlalchemy.orm import Session

from database import Base
from modelos.permiso_modelo import Permiso
from modelos.rol_permiso_modelo import RolPermiso


class Rol(Base):
    __tablename__ = "roles"

    id = Column(BigInteger, primary_key=True, index=True)
    nombre = Column(String(50), unique=True, nullable=False)
    descripcion = Column(Text, nullable=True)
    creado_en = Column(DateTime, nullable=False)
    actualizado_en = Column(DateTime, nullable=False)
    eliminado_en = Column(DateTime, nullable=True)


def rol_a_dict(rol: Rol) -> dict:
    return {
        "id": rol.id,
        "nombre": rol.nombre,
        "descripcion": rol.descripcion,
    }


def obtener_rol_activo(db: Session, rol_id: int) -> Rol:
    rol = db.query(Rol).filter(
        Rol.id == rol_id,
        Rol.eliminado_en.is_(None),
    ).first()
    if rol is None:
        raise HTTPException(status_code=404, detail="Rol no encontrado")
    return rol


def listar_roles(db: Session) -> list[dict]:
    roles = db.query(Rol).filter(Rol.eliminado_en.is_(None)).all()
    return [rol_a_dict(rol) for rol in roles]


def crear_rol(db: Session, nombre: str, descripcion: str | None) -> Rol:
    rol_existente = db.query(Rol).filter(Rol.nombre == nombre).first()
    if rol_existente is not None and rol_existente.eliminado_en is None:
        raise HTTPException(
            status_code=400,
            detail="Ya existe un rol con ese nombre",
        )

    ahora = datetime.now()
    nuevo_rol = Rol(
        nombre=nombre,
        descripcion=descripcion,
        creado_en=ahora,
        actualizado_en=ahora,
    )
    db.add(nuevo_rol)
    db.commit()
    db.refresh(nuevo_rol)
    return nuevo_rol


def actualizar_rol(
    db: Session,
    rol_id: int,
    nombre: str | None,
    descripcion: str | None,
) -> Rol:
    rol = obtener_rol_activo(db, rol_id)

    if nombre is not None and nombre != rol.nombre:
        otro = db.query(Rol).filter(Rol.nombre == nombre).first()
        if otro is not None and otro.id != rol_id and otro.eliminado_en is None:
            raise HTTPException(
                status_code=400,
                detail="Ya existe otro rol con ese nombre",
            )
        rol.nombre = nombre

    if descripcion is not None:
        rol.descripcion = descripcion

    rol.actualizado_en = datetime.now()
    db.commit()
    db.refresh(rol)
    return rol


def eliminar_rol(db: Session, rol_id: int) -> None:
    rol = obtener_rol_activo(db, rol_id)
    ahora = datetime.now()
    rol.eliminado_en = ahora
    rol.actualizado_en = ahora
    db.commit()


def listar_permisos_del_rol(db: Session, rol_id: int) -> dict:
    rol = obtener_rol_activo(db, rol_id)

    asignaciones = db.query(RolPermiso).filter(
        RolPermiso.rol_id == rol_id,
        RolPermiso.eliminado_en.is_(None),
    ).all()

    resultado = []
    for asignacion in asignaciones:
        permiso = db.query(Permiso).filter(Permiso.id == asignacion.permiso_id).first()
        if permiso is not None and permiso.eliminado_en is None:
            resultado.append({
                "permiso_id": permiso.id,
                "descripcion": permiso.descripcion,
            })

    return {
        "rol_id": rol.id,
        "rol": rol.nombre,
        "permisos": resultado,
    }


def asignar_permiso_a_rol(db: Session, rol_id: int, permiso_id: int) -> dict:
    obtener_rol_activo(db, rol_id)

    permiso = db.query(Permiso).filter(
        Permiso.id == permiso_id,
        Permiso.eliminado_en.is_(None),
    ).first()
    if permiso is None:
        raise HTTPException(status_code=404, detail="Permiso no encontrado")

    asignacion_existente = db.query(RolPermiso).filter(
        RolPermiso.rol_id == rol_id,
        RolPermiso.permiso_id == permiso_id,
    ).first()

    ahora = datetime.now()

    if asignacion_existente is not None and asignacion_existente.eliminado_en is None:
        raise HTTPException(
            status_code=400,
            detail="Ese permiso ya está asignado a este rol",
        )

    if asignacion_existente is not None:
        asignacion_existente.eliminado_en = None
        asignacion_existente.actualizado_en = ahora
        db.commit()
        return {"reasignado": True}

    nueva_asignacion = RolPermiso(
        rol_id=rol_id,
        permiso_id=permiso_id,
        creado_en=ahora,
        actualizado_en=ahora,
    )
    db.add(nueva_asignacion)
    db.commit()
    return {"reasignado": False}


def quitar_permiso_de_rol(db: Session, rol_id: int, permiso_id: int) -> None:
    asignacion = db.query(RolPermiso).filter(
        RolPermiso.rol_id == rol_id,
        RolPermiso.permiso_id == permiso_id,
        RolPermiso.eliminado_en.is_(None),
    ).first()
    if asignacion is None:
        raise HTTPException(status_code=404, detail="Asignación no encontrada")

    ahora = datetime.now()
    asignacion.eliminado_en = ahora
    asignacion.actualizado_en = ahora
    db.commit()
