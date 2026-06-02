from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from dependencias.auth_dependencia import (
    obtener_permisos_del_rol,
    obtener_usuario_actual,
)
from modelos.rol_modelo import Rol
from modelos.usuario_modelo import Usuario
from utilidades.contrasena_utilidad import verificar_contrasena
from utilidades.jwt_utilidad import crear_token
from utilidades.usuario_respuesta_utilidad import usuario_a_dict

router = APIRouter(prefix="/auth", tags=["Autenticación"])


class DatosLogin(BaseModel):
    correo: str
    contrasena: str


@router.post("/login")
def iniciar_sesion(datos: DatosLogin, db: Session = Depends(get_db)):
    consulta = db.query(Usuario).filter(
        Usuario.correo == datos.correo,
        Usuario.eliminado_en.is_(None),
    )
    usuario = consulta.first()

    if usuario is None:
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")

    contrasena_valida = verificar_contrasena(datos.contrasena, usuario.hash_contrasena)
    if not contrasena_valida:
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")

    consulta_rol = db.query(Rol).filter(Rol.id == usuario.rol_id)
    rol = consulta_rol.first()
    nombre_rol = rol.nombre if rol is not None else ""

    token, expira_en_segundos = crear_token(usuario.id, usuario.correo, usuario.rol_id)

    usuario_dict = usuario_a_dict(usuario, nombre_rol)
    usuario_dict["permisos"] = obtener_permisos_del_rol(db, usuario.rol_id)

    return {
        "mensaje": "Sesión iniciada con éxito",
        "token": token,
        "tipo_token": "Bearer",
        "expira_en_segundos": expira_en_segundos,
        "usuario": usuario_dict,
    }


@router.get("/perfil")
def obtener_perfil(usuario_actual: dict = Depends(obtener_usuario_actual)):
    """Devuelve el usuario autenticado y sus permisos (para menús del frontend)."""
    return {
        "mensaje": "Sesión activa",
        "usuario": usuario_actual,
    }
