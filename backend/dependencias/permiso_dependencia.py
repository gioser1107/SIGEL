from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from dependencias.auth_dependencia import obtener_permisos_del_rol, obtener_usuario_actual


def requiere_permiso(descripcion_permiso: str):
    """Exige que el usuario autenticado tenga un permiso concreto (por descripción en BD)."""

    def validar_permiso(
        usuario_actual: dict = Depends(obtener_usuario_actual),
        db: Session = Depends(get_db),
    ) -> dict:
        permisos = obtener_permisos_del_rol(db, usuario_actual["rol_id"])

        if descripcion_permiso not in permisos:
            raise HTTPException(
                status_code=403,
                detail=f"No tienes permiso para esta acción ({descripcion_permiso})",
            )

        return usuario_actual

    return validar_permiso
