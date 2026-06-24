from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from dependencias.auth_dependencia import obtener_usuario_actual
from dependencias.permiso_dependencia import requiere_permiso
from modelos.permiso_modelo import (
    PERMISO_BORRAR_USUARIOS,
    PERMISO_CREAR_USUARIOS,
    PERMISO_EDITAR_USUARIOS,
    PERMISO_LEER_USUARIOS,
)
from modelos.usuario_modelo import (
    actualizar_mi_perfil,
    actualizar_usuario,
    asignar_rol_a_usuario,
    buscar_usuario_activo,
    cambiar_mi_contrasena,
    crear_usuario,
    eliminar_usuario,
    listar_usuarios,
    resetear_contrasena_de_usuario,
    usuario_a_dict_con_rol,
)

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])


class DatosUsuarioNuevo(BaseModel):
    nombre: str
    apellido: str
    correo: str
    contrasena: str
    rol_id: int
    telefono: str | None = None


class DatosAsignarRol(BaseModel):
    rol_id: int


class DatosActualizarUsuario(BaseModel):
    nombre: str | None = None
    apellido: str | None = None
    correo: str | None = None
    telefono: str | None = None


class DatosActualizarMiPerfil(BaseModel):
    nombre: str | None = None
    apellido: str | None = None
    telefono: str | None = None


class DatosCambiarContrasena(BaseModel):
    contrasena_actual: str
    contrasena_nueva: str


class DatosResetearContrasena(BaseModel):
    contrasena_nueva: str


@router.get("/mi-perfil")
def obtener_mi_perfil(usuario_actual: dict = Depends(obtener_usuario_actual)):
    return {"usuario": usuario_actual}


@router.put("/mi-perfil")
def actualizar_mi_perfil_endpoint(
    datos: DatosActualizarMiPerfil,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    usuario_dict = actualizar_mi_perfil(
        db,
        usuario_actual["id"],
        nombre=datos.nombre,
        apellido=datos.apellido,
        telefono=datos.telefono,
    )
    return {
        "mensaje": "Perfil actualizado con éxito",
        "usuario": usuario_dict,
    }


@router.put("/mi-contrasena")
def cambiar_mi_contrasena_endpoint(
    datos: DatosCambiarContrasena,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    cambiar_mi_contrasena(
        db,
        usuario_actual["id"],
        datos.contrasena_actual,
        datos.contrasena_nueva,
    )
    return {"mensaje": "Contraseña actualizada con éxito"}


@router.get("/")
def obtener_todos_los_usuarios(
    pagina: int = Query(default=1, ge=1),
    limite: int = Query(default=10, ge=1, le=200),
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_USUARIOS)),
):
    return listar_usuarios(db, pagina=pagina, limite=limite)


@router.get("/{usuario_id}")
def obtener_usuario_por_id(
    usuario_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    puede_gestionar = PERMISO_LEER_USUARIOS in usuario_actual.get("permisos", [])
    es_el_mismo = usuario_actual["id"] == usuario_id

    if not puede_gestionar and not es_el_mismo:
        raise HTTPException(
            status_code=403,
            detail="No tienes permiso para ver este usuario",
        )

    usuario = buscar_usuario_activo(db, usuario_id)
    return {"usuario": usuario_a_dict_con_rol(db, usuario)}


@router.post("/")
def crear_usuario_endpoint(
    datos: DatosUsuarioNuevo,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_CREAR_USUARIOS)),
):
    usuario_dict = crear_usuario(
        db,
        nombre=datos.nombre,
        apellido=datos.apellido,
        correo=datos.correo,
        contrasena=datos.contrasena,
        rol_id=datos.rol_id,
        telefono=datos.telefono,
    )
    return {
        "mensaje": "Usuario creado con éxito",
        "usuario": usuario_dict,
    }


@router.put("/{usuario_id}")
def actualizar_usuario_endpoint(
    usuario_id: int,
    datos: DatosActualizarUsuario,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_USUARIOS)),
):
    usuario_dict = actualizar_usuario(
        db,
        usuario_id,
        nombre=datos.nombre,
        apellido=datos.apellido,
        correo=datos.correo,
        telefono=datos.telefono,
    )
    return {
        "mensaje": "Usuario actualizado con éxito",
        "usuario": usuario_dict,
    }


@router.put("/{usuario_id}/rol")
def asignar_rol_a_usuario_endpoint(
    usuario_id: int,
    datos: DatosAsignarRol,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_USUARIOS)),
):
    usuario_dict = asignar_rol_a_usuario(db, usuario_id, datos.rol_id)
    return {
        "mensaje": "Rol asignado al usuario con éxito",
        "usuario": usuario_dict,
    }


@router.put("/{usuario_id}/contrasena")
def resetear_contrasena_de_usuario_endpoint(
    usuario_id: int,
    datos: DatosResetearContrasena,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_USUARIOS)),
):
    resetear_contrasena_de_usuario(db, usuario_id, datos.contrasena_nueva)
    return {"mensaje": "Contraseña del usuario restablecida con éxito"}


@router.delete("/{usuario_id}")
def eliminar_usuario_endpoint(
    usuario_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_BORRAR_USUARIOS)),
):
    eliminar_usuario(db, usuario_id, usuario_actual["id"])
    return {
        "mensaje": "Usuario eliminado con éxito",
        "usuario_id": usuario_id,
    }
