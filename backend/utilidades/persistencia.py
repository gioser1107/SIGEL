"""Capa privada de escritura en base de datos.

Los controladores no deben importar este modulo. Solo los modelos de dominio
llaman a estas funciones al persistir INSERT/UPDATE/DELETE.
"""

from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session


def _persistir(db: Session, entidad, *, hacer_commit: bool = True):
    db.add(entidad)
    try:
        if hacer_commit:
            db.commit()
            db.refresh(entidad)
        else:
            db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Conflicto de concurrencia: el registro o el cupo ya fue tomado",
        )
    return entidad


def _confirmar_transaccion(db: Session) -> None:
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Conflicto de concurrencia: el cupo o asiento ya fue tomado",
        )


def _revertir_transaccion(db: Session) -> None:
    db.rollback()


def _marcar_eliminado_logico(entidad, ahora: datetime | None = None):
    marca = ahora or datetime.now()
    entidad.eliminado_en = marca
    if hasattr(entidad, "actualizado_en"):
        entidad.actualizado_en = marca
    return entidad
