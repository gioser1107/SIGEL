from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session

from modelos.punto_recogida_modelo import PuntoRecogida


def punto_recogida_a_dict(punto: PuntoRecogida) -> dict:
    return {
        "id": punto.id,
        "nombre": punto.nombre,
        "direccion": punto.direccion,
        "ciudad": punto.ciudad,
        "estado": punto.estado,
        "notas_referencia": punto.notas_referencia,
    }


def listar_puntos_recogida_activos(db: Session) -> list[dict]:
    puntos = (
        db.query(PuntoRecogida)
        .filter(
            PuntoRecogida.activo.is_(True),
            PuntoRecogida.eliminado_en.is_(None),
        )
        .order_by(PuntoRecogida.nombre)
        .all()
    )
    return [punto_recogida_a_dict(p) for p in puntos]


def crear_punto_recogida_publico(
    db: Session,
    nombre: str,
    direccion: str | None,
    ciudad: str | None,
    estado: str | None,
    notas_referencia: str | None,
) -> PuntoRecogida:
    nombre_limpio = nombre.strip()
    if not nombre_limpio:
        raise HTTPException(status_code=422, detail="El nombre del punto de recogida es requerido")

    ahora = datetime.now()
    nuevo_punto = PuntoRecogida(
        nombre=nombre_limpio,
        direccion=direccion,
        ciudad=ciudad,
        estado=estado,
        notas_referencia=notas_referencia,
        activo=True,
        creado_en=ahora,
        actualizado_en=ahora,
    )
    db.add(nuevo_punto)
    db.commit()
    db.refresh(nuevo_punto)
    return nuevo_punto
