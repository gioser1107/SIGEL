import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from database import get_db
from modelos.rol_modelo import Rol
from modelos.usuario_modelo import Usuario
from utilidades.jwt_utilidad import verificar_token

esquema_bearer = HTTPBearer()


def obtener_usuario_actual(
    credenciales: HTTPAuthorizationCredentials = Depends(esquema_bearer),
    db: Session = Depends(get_db),
) -> dict:
    """Lee el Bearer token, lo valida y devuelve los datos del usuario autenticado."""
    token = credenciales.credentials

    try:
        payload = verificar_token(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401,
            detail="El token expiró. Inicia sesión de nuevo",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=401,
            detail="Token inválido o corrupto",
        )

    usuario_id = int(payload.get("sub", 0))

    consulta_usuario = db.query(Usuario).filter(
        Usuario.id == usuario_id,
        Usuario.eliminado_en.is_(None),
    )
    usuario = consulta_usuario.first()

    if usuario is None:
        raise HTTPException(
            status_code=401,
            detail="Usuario del token no encontrado",
        )

    consulta_rol = db.query(Rol).filter(Rol.id == usuario.rol_id)
    rol = consulta_rol.first()
    nombre_rol = rol.nombre if rol is not None else ""

    return {
        "id": usuario.id,
        "rol_id": usuario.rol_id,
        "rol": nombre_rol,
        "correo": usuario.correo,
        "nombre_completo": usuario.nombre_completo,
        "telefono": usuario.telefono,
    }
