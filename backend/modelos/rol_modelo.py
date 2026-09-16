from datetime import datetime

from fastapi import HTTPException
from sqlalchemy import BigInteger, Column, DateTime, String, Text
from sqlalchemy.orm import Session

from database import Base, tabla_seguridad
from modelos.permiso_modelo import Permiso
from modelos.rol_permiso_modelo import RolPermiso
from utilidades.paginacion import paginar_consulta, respuesta_paginada
from utilidades.validaciones import ValidadorEntrada


class Rol(Base):
    __tablename__ = "roles"
    __table_args__ = tabla_seguridad()

    id = Column(BigInteger, primary_key=True, index=True)
    nombre = Column(String(50), unique=True, nullable=False)
    descripcion = Column(Text, nullable=True)
    creado_en = Column(DateTime, nullable=False)
    actualizado_en = Column(DateTime, nullable=False)
    eliminado_en = Column(DateTime, nullable=True)


MENSAJE_ROL_INTOCABLE = (
    "El rol Administrador es intocable: no se puede editar, eliminar ni cambiarle los permisos."
)


def es_nombre_rol_administrador(nombre: str | None) -> bool:
    return (nombre or "").strip().lower() in {"administrador", "admin"}


def asegurar_rol_modificable(rol: Rol) -> None:
    if es_nombre_rol_administrador(rol.nombre):
        raise HTTPException(status_code=400, detail=MENSAJE_ROL_INTOCABLE)


def rol_a_dict(rol: Rol) -> dict:
    return {
        "id": rol.id,
        "nombre": rol.nombre,
        "descripcion": rol.descripcion,
        "intocable": es_nombre_rol_administrador(rol.nombre),
    }


def obtener_rol_activo(db: Session, rol_id: int) -> Rol:
    rol = db.query(Rol).filter(
        Rol.id == rol_id,
        Rol.eliminado_en.is_(None),
    ).first()
    if rol is None:
        raise HTTPException(status_code=404, detail="Rol no encontrado")
    return rol


def listar_roles(db: Session, pagina: int = 1, limite: int = 10) -> dict:
    consulta = (
        db.query(Rol)
        .filter(Rol.eliminado_en.is_(None))
        .order_by(Rol.nombre.asc())
    )
    roles, total = paginar_consulta(consulta, pagina, limite)
    items = [rol_a_dict(rol) for rol in roles]
    return respuesta_paginada(items, total, pagina, limite)


def crear_rol(db: Session, nombre: str, descripcion: str | None) -> Rol:
    nombre_limpio = ValidadorEntrada.nombre_entidad(nombre, "nombre")
    if es_nombre_rol_administrador(nombre_limpio):
        raise HTTPException(
            status_code=400,
            detail="El rol Administrador ya existe y no se puede duplicar.",
        )
    rol_existente = db.query(Rol).filter(Rol.nombre == nombre_limpio).first()
    if rol_existente is not None and rol_existente.eliminado_en is None:
        raise HTTPException(
            status_code=400,
            detail="Ya existe un rol con ese nombre",
        )

    ahora = datetime.now()
    nuevo_rol = Rol(
        nombre=nombre_limpio,
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
    asegurar_rol_modificable(rol)

    if nombre is not None and nombre != rol.nombre:
        nombre_limpio = ValidadorEntrada.nombre_entidad(nombre, "nombre")
        if es_nombre_rol_administrador(nombre_limpio):
            raise HTTPException(
                status_code=400,
                detail="No se puede renombrar un rol como Administrador.",
            )
        otro = db.query(Rol).filter(Rol.nombre == nombre_limpio).first()
        if otro is not None and otro.id != rol_id and otro.eliminado_en is None:
            raise HTTPException(
                status_code=400,
                detail="Ya existe otro rol con ese nombre",
            )
        rol.nombre = nombre_limpio

    if descripcion is not None:
        rol.descripcion = descripcion

    rol.actualizado_en = datetime.now()
    db.commit()
    db.refresh(rol)
    return rol


def eliminar_rol(db: Session, rol_id: int) -> None:
    rol = obtener_rol_activo(db, rol_id)
    asegurar_rol_modificable(rol)
    ahora = datetime.now()
    rol.eliminado_en = ahora
    rol.actualizado_en = ahora
    db.commit()


def listar_permisos_del_rol(db: Session, rol_id: int) -> dict:
    rol = obtener_rol_activo(db, rol_id)

    if es_nombre_rol_administrador(rol.nombre):
        permisos = (
            db.query(Permiso)
            .filter(Permiso.eliminado_en.is_(None))
            .order_by(Permiso.descripcion.asc())
            .all()
        )
        resultado = [
            {"permiso_id": permiso.id, "descripcion": permiso.descripcion}
            for permiso in permisos
        ]
    else:
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
    rol = obtener_rol_activo(db, rol_id)
    asegurar_rol_modificable(rol)

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
    rol = obtener_rol_activo(db, rol_id)
    asegurar_rol_modificable(rol)
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
