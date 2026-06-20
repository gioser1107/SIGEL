from datetime import datetime
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from modelos.asiento_modelo import Asiento
from modelos.unidad_transporte_modelo import UnidadTransporte


def asiento_a_dict(asiento: Asiento) -> dict:
    return {
        "id": asiento.id,
        "unidad_id": asiento.unidad_id,
        "numero": asiento.numero,
        "posicion": asiento.posicion,
    }


def obtener_asiento_activo(db: Session, asiento_id: int) -> Asiento:
    asiento = db.query(Asiento).filter(
        Asiento.id == asiento_id,
        Asiento.eliminado_en.is_(None),
    ).first()
    if not asiento:
        raise HTTPException(status_code=404, detail="Asiento no encontrado")
    return asiento


def listar_asientos(db: Session, unidad_id: Optional[int] = None) -> list[dict]:
    consulta = db.query(Asiento).filter(Asiento.eliminado_en.is_(None))
    if unidad_id:
        consulta = consulta.filter(Asiento.unidad_id == unidad_id)
    asientos = consulta.order_by(Asiento.id).all()
    return [asiento_a_dict(a) for a in asientos]


def crear_asiento(
    db: Session,
    unidad_id: int,
    numero: str,
    posicion: str,
) -> Asiento:
    unidad = db.query(UnidadTransporte).filter(
        UnidadTransporte.id == unidad_id,
        UnidadTransporte.eliminado_en.is_(None),
    ).first()
    if not unidad:
        raise HTTPException(
            status_code=404,
            detail="Unidad de transporte no encontrada o está eliminada",
        )

    ahora = datetime.now()
    nuevo_asiento = Asiento(
        unidad_id=unidad_id,
        numero=numero,
        posicion=posicion,
        creado_en=ahora,
        actualizado_en=ahora,
    )
    db.add(nuevo_asiento)
    db.commit()
    db.refresh(nuevo_asiento)
    return nuevo_asiento


def actualizar_asiento(
    db: Session,
    asiento_id: int,
    numero: Optional[str],
    posicion: Optional[str],
) -> Asiento:
    asiento = obtener_asiento_activo(db, asiento_id)

    if numero is not None:
        asiento.numero = numero
    if posicion is not None:
        asiento.posicion = posicion

    asiento.actualizado_en = datetime.now()
    db.commit()
    return asiento


def eliminar_asiento(db: Session, asiento_id: int) -> None:
    asiento = obtener_asiento_activo(db, asiento_id)
    ahora = datetime.now()
    asiento.eliminado_en = ahora
    asiento.actualizado_en = ahora
    db.commit()
