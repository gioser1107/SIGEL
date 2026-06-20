from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from dependencias.permiso_dependencia import requiere_permiso
from modelos.permiso_modelo import (
    PERMISO_BORRAR_PERMISOS,
    PERMISO_CREAR_PERMISOS,
    PERMISO_EDITAR_PERMISOS,
    PERMISO_LEER_PERMISOS,
    actualizar_permiso,
    crear_permiso,
    eliminar_permiso,
    listar_permisos,
    obtener_permiso_activo,
    permiso_a_dict,
)

router = APIRouter(prefix="/permisos", tags=["Permisos"])


class DatosPermisoNuevo(BaseModel):
    descripcion: str


class DatosPermisoActualizar(BaseModel):
    descripcion: str


@router.get("/")
def obtener_todos_los_permisos(
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_PERMISOS)),
):
    return listar_permisos(db)


@router.get("/{permiso_id}")
def obtener_permiso_por_id(
    permiso_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_PERMISOS)),
):
    permiso = obtener_permiso_activo(db, permiso_id)
    return {"permiso": permiso_a_dict(permiso)}


@router.post("/")
def crear_permiso_endpoint(
    datos: DatosPermisoNuevo,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_CREAR_PERMISOS)),
):
    nuevo_permiso = crear_permiso(db, datos.descripcion)
    return {
        "mensaje": "Permiso creado con éxito",
        "permiso": permiso_a_dict(nuevo_permiso),
    }


@router.put("/{permiso_id}")
def actualizar_permiso_endpoint(
    permiso_id: int,
    datos: DatosPermisoActualizar,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_PERMISOS)),
):
    permiso = actualizar_permiso(db, permiso_id, datos.descripcion)
    return {
        "mensaje": "Permiso actualizado con éxito",
        "permiso": permiso_a_dict(permiso),
    }


@router.delete("/{permiso_id}")
def eliminar_permiso_endpoint(
    permiso_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_BORRAR_PERMISOS)),
):
    eliminar_permiso(db, permiso_id)
    return {
        "mensaje": "Permiso eliminado con éxito",
        "permiso_id": permiso_id,
    }
