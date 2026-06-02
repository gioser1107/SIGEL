from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from dependencias.auth_dependencia import obtener_usuario_actual
from modelos.permiso_modelo import Permiso
from modelos.rol_modelo import Rol
from modelos.rol_permiso_modelo import RolPermiso

router = APIRouter(prefix="/roles", tags=["Roles"])


class DatosRolNuevo(BaseModel):
    nombre: str
    descripcion: str | None = None


class DatosAsignarPermiso(BaseModel):
    permiso_id: int


@router.get("/")
def obtener_todos_los_roles(db: Session = Depends(get_db)):
    """Lista todos los roles activos del sistema."""
    consulta = db.query(Rol).filter(Rol.eliminado_en.is_(None))
    lista_roles = consulta.all()

    resultado = []
    for rol in lista_roles:
        rol_dict = {
            "id": rol.id,
            "nombre": rol.nombre,
            "descripcion": rol.descripcion,
        }
        resultado.append(rol_dict)

    return resultado


@router.post("/")
def crear_rol(
    datos: DatosRolNuevo,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    """Crea un rol nuevo."""
    consulta_nombre = db.query(Rol).filter(Rol.nombre == datos.nombre)
    rol_existente = consulta_nombre.first()

    if rol_existente is not None and rol_existente.eliminado_en is None:
        raise HTTPException(
            status_code=400,
            detail="Ya existe un rol con ese nombre",
        )

    ahora = datetime.now()

    nuevo_rol = Rol(
        nombre=datos.nombre,
        descripcion=datos.descripcion,
        creado_en=ahora,
        actualizado_en=ahora,
    )

    db.add(nuevo_rol)
    db.commit()
    db.refresh(nuevo_rol)

    return {
        "mensaje": "Rol creado con éxito",
        "rol": {
            "id": nuevo_rol.id,
            "nombre": nuevo_rol.nombre,
            "descripcion": nuevo_rol.descripcion,
        },
    }


@router.get("/{rol_id}/permisos")
def obtener_permisos_del_rol(
    rol_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    """Lista los permisos asignados a un rol."""
    consulta_rol = db.query(Rol).filter(
        Rol.id == rol_id,
        Rol.eliminado_en.is_(None),
    )
    rol = consulta_rol.first()

    if rol is None:
        raise HTTPException(status_code=404, detail="Rol no encontrado")

    consulta_asignaciones = db.query(RolPermiso).filter(
        RolPermiso.rol_id == rol_id,
        RolPermiso.eliminado_en.is_(None),
    )
    asignaciones = consulta_asignaciones.all()

    resultado = []
    for asignacion in asignaciones:
        consulta_permiso = db.query(Permiso).filter(Permiso.id == asignacion.permiso_id)
        permiso = consulta_permiso.first()

        if permiso is not None and permiso.eliminado_en is None:
            permiso_dict = {
                "permiso_id": permiso.id,
                "descripcion": permiso.descripcion,
            }
            resultado.append(permiso_dict)

    return {
        "rol_id": rol.id,
        "rol": rol.nombre,
        "permisos": resultado,
    }


@router.post("/{rol_id}/permisos")
def asignar_permiso_a_rol(
    rol_id: int,
    datos: DatosAsignarPermiso,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    """Asigna un permiso existente a un rol."""
    consulta_rol = db.query(Rol).filter(
        Rol.id == rol_id,
        Rol.eliminado_en.is_(None),
    )
    rol = consulta_rol.first()

    if rol is None:
        raise HTTPException(status_code=404, detail="Rol no encontrado")

    consulta_permiso = db.query(Permiso).filter(
        Permiso.id == datos.permiso_id,
        Permiso.eliminado_en.is_(None),
    )
    permiso = consulta_permiso.first()

    if permiso is None:
        raise HTTPException(status_code=404, detail="Permiso no encontrado")

    consulta_asignacion = db.query(RolPermiso).filter(
        RolPermiso.rol_id == rol_id,
        RolPermiso.permiso_id == datos.permiso_id,
        RolPermiso.eliminado_en.is_(None),
    )
    asignacion_existente = consulta_asignacion.first()

    if asignacion_existente is not None:
        raise HTTPException(
            status_code=400,
            detail="Ese permiso ya está asignado a este rol",
        )

    ahora = datetime.now()

    nueva_asignacion = RolPermiso(
        rol_id=rol_id,
        permiso_id=datos.permiso_id,
        creado_en=ahora,
        actualizado_en=ahora,
    )

    db.add(nueva_asignacion)
    db.commit()

    return {
        "mensaje": "Permiso asignado al rol con éxito",
        "rol_id": rol_id,
        "permiso_id": datos.permiso_id,
    }


@router.delete("/{rol_id}/permisos/{permiso_id}")
def quitar_permiso_de_rol(
    rol_id: int,
    permiso_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    """Quita un permiso de un rol (soft delete)."""
    consulta_asignacion = db.query(RolPermiso).filter(
        RolPermiso.rol_id == rol_id,
        RolPermiso.permiso_id == permiso_id,
        RolPermiso.eliminado_en.is_(None),
    )
    asignacion = consulta_asignacion.first()

    if asignacion is None:
        raise HTTPException(
            status_code=404,
            detail="Asignación no encontrada",
        )

    asignacion.eliminado_en = datetime.now()
    asignacion.actualizado_en = datetime.now()
    db.commit()

    return {
        "mensaje": "Permiso removido del rol con éxito",
        "rol_id": rol_id,
        "permiso_id": permiso_id,
    }
