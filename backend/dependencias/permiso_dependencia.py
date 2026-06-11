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


def requiere_alguno_de_permisos(*descripciones_permisos: str):
    """Exige al menos uno de los permisos indicados."""

    def validar_permiso(
        usuario_actual: dict = Depends(obtener_usuario_actual),
        db: Session = Depends(get_db),
    ) -> dict:
        permisos = obtener_permisos_del_rol(db, usuario_actual["rol_id"])

        for descripcion in descripciones_permisos:
            if descripcion in permisos:
                return usuario_actual

        lista = ", ".join(descripciones_permisos)
        raise HTTPException(
            status_code=403,
            detail=f"No tienes permiso para esta acción ({lista})",
        )

    return validar_permiso
