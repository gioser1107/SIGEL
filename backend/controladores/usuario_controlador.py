from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from dependencias.auth_dependencia import obtener_usuario_actual
from modelos.rol_modelo import Rol
from modelos.usuario_modelo import Usuario

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])


class DatosAsignarRol(BaseModel):
    rol_id: int


@router.get("/")
def obtener_todos_los_usuarios(
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    """Obtiene la lista de usuarios activos (sin contraseña)."""
    consulta = db.query(Usuario).filter(Usuario.eliminado_en.is_(None))
    lista_usuarios = consulta.all()

    resultado = []
    for usuario in lista_usuarios:
        consulta_rol = db.query(Rol).filter(Rol.id == usuario.rol_id)
        rol = consulta_rol.first()
        nombre_rol = rol.nombre if rol is not None else ""

        usuario_dict = {
            "id": usuario.id,
            "rol_id": usuario.rol_id,
            "rol": nombre_rol,
            "correo": usuario.correo,
            "nombre_completo": usuario.nombre_completo,
            "telefono": usuario.telefono,
        }
        resultado.append(usuario_dict)

    return resultado


@router.put("/{usuario_id}/rol")
def asignar_rol_a_usuario(
    usuario_id: int,
    datos: DatosAsignarRol,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    """Asigna un rol a un usuario existente."""
    consulta_usuario = db.query(Usuario).filter(
        Usuario.id == usuario_id,
        Usuario.eliminado_en.is_(None),
    )
    usuario = consulta_usuario.first()

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
        "usuario": {
            "id": usuario.id,
            "nombre_completo": usuario.nombre_completo,
            "correo": usuario.correo,
            "rol_id": usuario.rol_id,
            "rol": rol.nombre,
        },
    }
