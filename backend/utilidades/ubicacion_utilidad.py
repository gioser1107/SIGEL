from fastapi import HTTPException
from sqlalchemy.orm import Session

from modelos.ciudad_modelo import Ciudad
from modelos.estado_modelo import Estado


def estado_a_dict(estado: Estado) -> dict:
    return {
        "id": estado.id,
        "nombre": estado.nombre,
    }


def ciudad_a_dict(ciudad: Ciudad) -> dict:
    return {
        "id": ciudad.id,
        "estado_id": ciudad.estado_id,
        "nombre": ciudad.nombre,
    }


def listar_estados(db: Session) -> list[dict]:
    estados = (
        db.query(Estado)
        .filter(Estado.eliminado_en.is_(None))
        .order_by(Estado.nombre)
        .all()
    )
    return [estado_a_dict(estado) for estado in estados]


def listar_ciudades_por_estado(db: Session, estado_id: int) -> dict:
    estado = db.query(Estado).filter(
        Estado.id == estado_id,
        Estado.eliminado_en.is_(None),
    ).first()
    if estado is None:
        raise HTTPException(status_code=404, detail="Estado no encontrado")

    ciudades = (
        db.query(Ciudad)
        .filter(
            Ciudad.estado_id == estado_id,
            Ciudad.eliminado_en.is_(None),
        )
        .order_by(Ciudad.nombre)
        .all()
    )

    return {
        "estado": estado_a_dict(estado),
        "ciudades": [ciudad_a_dict(ciudad) for ciudad in ciudades],
    }
