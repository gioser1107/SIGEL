from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from dependencias.auth_dependencia import obtener_usuario_actual
from dependencias.permiso_dependencia import requiere_permiso
from modelos.rol_modelo import Rol
from modelos.usuario_modelo import Usuario
from utilidades.contrasena_utilidad import hashear_contrasena, verificar_contrasena
from utilidades.permisos_constantes import (
    PERMISO_BORRAR_USUARIOS,
    PERMISO_CREAR_USUARIOS,
    PERMISO_EDITAR_USUARIOS,
    PERMISO_LEER_USUARIOS,
)
from utilidades.usuario_respuesta_utilidad import usuario_a_dict

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

def obtener_nombre_rol(db: Session, rol_id: int) -> str:
    consulta_rol = db.query(Rol).filter(Rol.id == rol_id)
    rol = consulta_rol.first()
    return rol.nombre if rol is not None else ""

def buscar_usuario_activo(db: Session, usuario_id: int) -> Usuario | None:
    consulta = db.query(Usuario).filter(
        Usuario.id == usuario_id,
        Usuario.eliminado_en.is_(None),
    )
    return consulta.first()

@router.get("/mi-perfil")
def obtener_mi_perfil(usuario_actual: dict = Depends(obtener_usuario_actual)):
    return {"usuario": usuario_actual}

@router.put("/mi-perfil")
def actualizar_mi_perfil(
    datos: DatosActualizarMiPerfil,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    usuario = buscar_usuario_activo(db, usuario_actual["id"])

    if usuario is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if datos.nombre is not None:
        usuario.nombre = datos.nombre

    if datos.apellido is not None:
        usuario.apellido = datos.apellido

    if datos.telefono is not None:
        usuario.telefono = datos.telefono

    usuario.actualizado_en = datetime.now()
    db.commit()
    db.refresh(usuario)

    nombre_rol = obtener_nombre_rol(db, usuario.rol_id)

    return {
        "mensaje": "Perfil actualizado con éxito",
        "usuario": usuario_a_dict(usuario, nombre_rol),
    }

@router.put("/mi-contrasena")
def cambiar_mi_contrasena(
    datos: DatosCambiarContrasena,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    usuario = buscar_usuario_activo(db, usuario_actual["id"])

    if usuario is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    contrasena_valida = verificar_contrasena(
        datos.contrasena_actual,
        usuario.hash_contrasena,
    )
    if not contrasena_valida:
        raise HTTPException(status_code=400, detail="La contraseña actual no es correcta")

    usuario.hash_contrasena = hashear_contrasena(datos.contrasena_nueva)
    usuario.actualizado_en = datetime.now()
    db.commit()

    return {"mensaje": "Contraseña actualizada con éxito"}

@router.get("/")
def obtener_todos_los_usuarios(
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_USUARIOS)),
):
    consulta = db.query(Usuario).filter(Usuario.eliminado_en.is_(None))
    lista_usuarios = consulta.all()

    resultado = []
    for usuario in lista_usuarios:
        nombre_rol = obtener_nombre_rol(db, usuario.rol_id)
        resultado.append(usuario_a_dict(usuario, nombre_rol))

    return resultado

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

    if usuario is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    nombre_rol = obtener_nombre_rol(db, usuario.rol_id)

    return {"usuario": usuario_a_dict(usuario, nombre_rol)}

@router.post("/")
def crear_usuario(
    datos: DatosUsuarioNuevo,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_CREAR_USUARIOS)),
):
    consulta_correo = db.query(Usuario).filter(Usuario.correo == datos.correo)
    usuario_existente = consulta_correo.first()

    if usuario_existente is not None and usuario_existente.eliminado_en is None:
        raise HTTPException(
            status_code=400,
            detail="El correo ya está registrado en el sistema",
        )

    consulta_rol = db.query(Rol).filter(
        Rol.id == datos.rol_id,
        Rol.eliminado_en.is_(None),
    )
    rol = consulta_rol.first()

    if rol is None:
        raise HTTPException(status_code=400, detail="El rol seleccionado no existe")

    ahora = datetime.now()
    hash_contrasena = hashear_contrasena(datos.contrasena)

    nuevo_usuario = Usuario(
        rol_id=datos.rol_id,
        correo=datos.correo,
        hash_contrasena=hash_contrasena,
        nombre=datos.nombre,
        apellido=datos.apellido,
        telefono=datos.telefono,
        creado_en=ahora,
        actualizado_en=ahora,
    )

    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)

    return {
        "mensaje": "Usuario creado con éxito",
        "usuario": usuario_a_dict(nuevo_usuario, rol.nombre),
    }

@router.put("/{usuario_id}")
def actualizar_usuario(
    usuario_id: int,
    datos: DatosActualizarUsuario,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_USUARIOS)),
):
    usuario = buscar_usuario_activo(db, usuario_id)

    if usuario is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if datos.correo is not None and datos.correo != usuario.correo:
        consulta_correo = db.query(Usuario).filter(Usuario.correo == datos.correo)
        otro = consulta_correo.first()

        if otro is not None and otro.id != usuario_id and otro.eliminado_en is None:
            raise HTTPException(
                status_code=400,
                detail="El correo ya está en uso por otro usuario",
            )

        usuario.correo = datos.correo

    if datos.nombre is not None:
        usuario.nombre = datos.nombre

    if datos.apellido is not None:
        usuario.apellido = datos.apellido

    if datos.telefono is not None:
        usuario.telefono = datos.telefono

    usuario.actualizado_en = datetime.now()
    db.commit()
    db.refresh(usuario)

    nombre_rol = obtener_nombre_rol(db, usuario.rol_id)

    return {
        "mensaje": "Usuario actualizado con éxito",
        "usuario": usuario_a_dict(usuario, nombre_rol),
    }

@router.put("/{usuario_id}/rol")
def asignar_rol_a_usuario(
    usuario_id: int,
    datos: DatosAsignarRol,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_USUARIOS)),
):
    usuario = buscar_usuario_activo(db, usuario_id)

    if usuario is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    consulta_rol = db.query(Rol).filter(
        Rol.id == datos.rol_id,
        Rol.eliminado_en.is_(None),
    )
    rol = consulta_rol.first()

    if rol is None:
        raise HTTPException(status_code=404, detail="Rol no encontrado")

    usuario.rol_id = datos.rol_id
    usuario.actualizado_en = datetime.now()
    db.commit()
    db.refresh(usuario)

    return {
        "mensaje": "Rol asignado al usuario con éxito",
        "usuario": usuario_a_dict(usuario, rol.nombre),
    }

@router.put("/{usuario_id}/contrasena")
def resetear_contrasena_de_usuario(
    usuario_id: int,
    datos: DatosResetearContrasena,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_USUARIOS)),
):
    usuario = buscar_usuario_activo(db, usuario_id)

    if usuario is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    usuario.hash_contrasena = hashear_contrasena(datos.contrasena_nueva)
    usuario.actualizado_en = datetime.now()
    db.commit()

    return {"mensaje": "Contraseña del usuario restablecida con éxito"}

@router.delete("/{usuario_id}")
def eliminar_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_BORRAR_USUARIOS)),
):
    if usuario_actual["id"] == usuario_id:
        raise HTTPException(
            status_code=400,
            detail="No puedes eliminar tu propia cuenta mientras estás en sesión",
        )

    usuario = buscar_usuario_activo(db, usuario_id)

    if usuario is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    ahora = datetime.now()
    usuario.eliminado_en = ahora
    usuario.actualizado_en = ahora
    db.commit()

    return {
        "mensaje": "Usuario eliminado con éxito",
        "usuario_id": usuario_id,
    }
