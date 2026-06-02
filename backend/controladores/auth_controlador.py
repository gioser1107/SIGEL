import hashlib
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from dependencias.auth_dependencia import obtener_usuario_actual
from modelos.rol_modelo import Rol
from modelos.usuario_modelo import Usuario
from utilidades.jwt_utilidad import crear_token

router = APIRouter(prefix="/auth", tags=["Autenticación"])


class DatosLogin(BaseModel):
    correo: str
    contrasena: str


class DatosRegistro(BaseModel):
    nombre_completo: str
    correo: str
    contrasena: str
    rol_id: int
    telefono: str | None = None


def hashear_contrasena(contrasena: str) -> str:
    return hashlib.sha256(contrasena.encode("utf-8")).hexdigest()


def verificar_contrasena(contrasena: str, hash_guardado: str) -> bool:
    hash_ingresado = hashear_contrasena(contrasena)
    return hash_ingresado == hash_guardado


def usuario_a_dict(usuario: Usuario, nombre_rol: str) -> dict:
    return {
        "id": usuario.id,
        "rol_id": usuario.rol_id,
        "rol": nombre_rol,
        "correo": usuario.correo,
        "nombre_completo": usuario.nombre_completo,
        "telefono": usuario.telefono,
    }


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

    return {
        "mensaje": "Sesión iniciada con éxito",
        "token": token,
        "tipo_token": "Bearer",
        "expira_en_segundos": expira_en_segundos,
        "usuario": usuario_a_dict(usuario, nombre_rol),
    }


@router.get("/perfil")
def obtener_perfil(usuario_actual: dict = Depends(obtener_usuario_actual)):
    """Devuelve el usuario autenticado según el Bearer token."""
    return {
        "mensaje": "Token válido",
        "usuario": usuario_actual,
    }


@router.post("/registro")
def registrar_usuario(datos: DatosRegistro, db: Session = Depends(get_db)):
    consulta_correo = db.query(Usuario).filter(Usuario.correo == datos.correo)
    usuario_existente = consulta_correo.first()

    if usuario_existente is not None:
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

    hash_contrasena = hashear_contrasena(datos.contrasena)
    ahora = datetime.now()

    nuevo_usuario = Usuario(
        rol_id=datos.rol_id,
        correo=datos.correo,
        hash_contrasena=hash_contrasena,
        nombre_completo=datos.nombre_completo,
        telefono=datos.telefono,
        creado_en=ahora,
        actualizado_en=ahora,
    )

    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)

    return {
        "mensaje": "Usuario registrado con éxito",
        "usuario": usuario_a_dict(nuevo_usuario, rol.nombre),
    }
