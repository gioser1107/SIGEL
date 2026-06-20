from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session

from modelos.permiso_modelo import Permiso


def permiso_a_dict(permiso: Permiso) -> dict:
    return {
        "id": permiso.id,
        "descripcion": permiso.descripcion,
    }


def obtener_permiso_activo(db: Session, permiso_id: int) -> Permiso:
    permiso = db.query(Permiso).filter(
        Permiso.id == permiso_id,
        Permiso.eliminado_en.is_(None),
    ).first()
    if permiso is None:
        raise HTTPException(status_code=404, detail="Permiso no encontrado")
    return permiso


def listar_permisos(db: Session) -> list[dict]:
    permisos = db.query(Permiso).filter(Permiso.eliminado_en.is_(None)).all()
    return [permiso_a_dict(permiso) for permiso in permisos]


def crear_permiso(db: Session, descripcion: str) -> Permiso:
    ahora = datetime.now()
    nuevo_permiso = Permiso(
        descripcion=descripcion,
        creado_en=ahora,
        actualizado_en=ahora,
    )
    db.add(nuevo_permiso)
    db.commit()
    db.refresh(nuevo_permiso)
    return nuevo_permiso


def actualizar_permiso(db: Session, permiso_id: int, descripcion: str) -> Permiso:
    permiso = obtener_permiso_activo(db, permiso_id)
    permiso.descripcion = descripcion
    permiso.actualizado_en = datetime.now()
    db.commit()
    db.refresh(permiso)
    return permiso


def eliminar_permiso(db: Session, permiso_id: int) -> None:
    permiso = obtener_permiso_activo(db, permiso_id)
    ahora = datetime.now()
    permiso.eliminado_en = ahora
    permiso.actualizado_en = ahora
    db.commit()
