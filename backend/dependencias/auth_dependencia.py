import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from database import get_db
from modelos.permiso_modelo import Permiso
from modelos.rol_modelo import Rol
from modelos.rol_permiso_modelo import RolPermiso
from modelos.usuario_modelo import Usuario
from modelos.cliente_modelo import resolver_cliente_id_portal
from modelos.usuario_modelo import verificar_token

esquema_bearer = HTTPBearer(auto_error=True)

def obtener_permisos_del_rol(db: Session, rol_id: int) -> list[str]:
    consulta_asignaciones = db.query(RolPermiso).filter(
        RolPermiso.rol_id == rol_id,
        RolPermiso.eliminado_en.is_(None),
    )
    asignaciones = consulta_asignaciones.all()

    resultado = []
    for asignacion in asignaciones:
        consulta_permiso = db.query(Permiso).filter(
            Permiso.id == asignacion.permiso_id,
            Permiso.eliminado_en.is_(None),
        )
        permiso = consulta_permiso.first()

        if permiso is not None and permiso.descripcion:
            resultado.append(permiso.descripcion)

    return resultado

def obtener_usuario_actual(
    credenciales: HTTPAuthorizationCredentials = Depends(esquema_bearer),
    db: Session = Depends(get_db),
) -> dict:
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
    if usuario_id <= 0:
        raise HTTPException(status_code=401, detail="Token sin identificador de usuario")

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

    correo_token = (payload.get("correo") or "").strip().lower()
    if correo_token and correo_token != (usuario.correo or "").strip().lower():
        raise HTTPException(
            status_code=401,
            detail="El token no coincide con el usuario actual. Inicia sesión de nuevo",
        )

    rol_id_token = payload.get("rol_id")
    if rol_id_token is not None and int(rol_id_token) != usuario.rol_id:
        raise HTTPException(
            status_code=401,
            detail="El rol del token ya no es válido. Inicia sesión de nuevo",
        )

    consulta_rol = db.query(Rol).filter(
        Rol.id == usuario.rol_id,
        Rol.eliminado_en.is_(None),
    )
    rol = consulta_rol.first()
    if rol is None:
        raise HTTPException(status_code=401, detail="El rol del usuario no está activo")
    nombre_rol = rol.nombre

    permisos = obtener_permisos_del_rol(db, usuario.rol_id)

    cliente_id = resolver_cliente_id_portal(db, usuario.id, nombre_rol)

    return {
        "id": usuario.id,
        "rol_id": usuario.rol_id,
        "rol": nombre_rol,
        "correo": usuario.correo,
        "nombre": usuario.nombre,
        "apellido": usuario.apellido,
        "telefono": usuario.telefono,
        "permisos": permisos,
        "cliente_id": cliente_id,
    }
