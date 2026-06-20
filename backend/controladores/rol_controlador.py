from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from dependencias.permiso_dependencia import requiere_permiso
from modelos.permiso_modelo import (
    PERMISO_BORRAR_ROLES,
    PERMISO_CREAR_ROLES,
    PERMISO_EDITAR_ROLES,
    PERMISO_LEER_ROLES,
)
from modelos.rol_modelo import (
    actualizar_rol,
    asignar_permiso_a_rol,
    crear_rol,
    eliminar_rol,
    listar_permisos_del_rol,
    listar_roles,
    obtener_rol_activo,
    quitar_permiso_de_rol,
    rol_a_dict,
)

router = APIRouter(prefix="/roles", tags=["Roles"])


class DatosRolNuevo(BaseModel):
    nombre: str
    descripcion: str | None = None


class DatosRolActualizar(BaseModel):
    nombre: str | None = None
    descripcion: str | None = None


class DatosAsignarPermiso(BaseModel):
    permiso_id: int


@router.get("/")
def obtener_todos_los_roles(
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_ROLES)),
):
    return listar_roles(db)


@router.get("/{rol_id}")
def obtener_rol_por_id(
    rol_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_ROLES)),
):
    rol = obtener_rol_activo(db, rol_id)
    return {"rol": rol_a_dict(rol)}


@router.post("/")
def crear_rol_endpoint(
    datos: DatosRolNuevo,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_CREAR_ROLES)),
):
    nuevo_rol = crear_rol(db, datos.nombre, datos.descripcion)
    return {
        "mensaje": "Rol creado con éxito",
        "rol": rol_a_dict(nuevo_rol),
    }


@router.put("/{rol_id}")
def actualizar_rol_endpoint(
    rol_id: int,
    datos: DatosRolActualizar,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_ROLES)),
):
    rol = actualizar_rol(db, rol_id, datos.nombre, datos.descripcion)
    return {
        "mensaje": "Rol actualizado con éxito",
        "rol": rol_a_dict(rol),
    }


@router.delete("/{rol_id}")
def eliminar_rol_endpoint(
    rol_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_BORRAR_ROLES)),
):
    eliminar_rol(db, rol_id)
    return {
        "mensaje": "Rol eliminado con éxito",
        "rol_id": rol_id,
    }


@router.get("/{rol_id}/permisos")
def obtener_permisos_del_rol(
    rol_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_ROLES)),
):
    return listar_permisos_del_rol(db, rol_id)


@router.post("/{rol_id}/permisos")
def asignar_permiso_a_rol_endpoint(
    rol_id: int,
    datos: DatosAsignarPermiso,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_ROLES)),
):
    resultado = asignar_permiso_a_rol(db, rol_id, datos.permiso_id)
    mensaje = (
        "Permiso reasignado al rol con éxito"
        if resultado["reasignado"]
        else "Permiso asignado al rol con éxito"
    )
    return {
        "mensaje": mensaje,
        "rol_id": rol_id,
        "permiso_id": datos.permiso_id,
    }


@router.delete("/{rol_id}/permisos/{permiso_id}")
def quitar_permiso_de_rol_endpoint(
    rol_id: int,
    permiso_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_ROLES)),
):
    quitar_permiso_de_rol(db, rol_id, permiso_id)
    return {
        "mensaje": "Permiso removido del rol con éxito",
        "rol_id": rol_id,
        "permiso_id": permiso_id,
    }
