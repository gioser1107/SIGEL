from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from modelos.ciudad_modelo import Ciudad
from modelos.estado_modelo import Estado

router = APIRouter(prefix="/ubicaciones", tags=["Ubicaciones"])

@router.get("/estados")
def listar_estados(db: Session = Depends(get_db)):
    consulta = db.query(Estado).filter(Estado.eliminado_en.is_(None)).order_by(Estado.nombre)
    lista = consulta.all()

    resultado = []
    for estado in lista:
        resultado.append(
            {
                "id": estado.id,
                "nombre": estado.nombre,
            }
        )

    return resultado

@router.get("/estados/{estado_id}/ciudades")
def listar_ciudades_por_estado(estado_id: int, db: Session = Depends(get_db)):
    consulta_estado = db.query(Estado).filter(
        Estado.id == estado_id,
        Estado.eliminado_en.is_(None),
    )
    estado = consulta_estado.first()

    if estado is None:
        raise HTTPException(status_code=404, detail="Estado no encontrado")

    consulta = db.query(Ciudad).filter(
        Ciudad.estado_id == estado_id,
        Ciudad.eliminado_en.is_(None),
    ).order_by(Ciudad.nombre)
    lista = consulta.all()

    resultado = []
    for ciudad in lista:
        resultado.append(
            {
                "id": ciudad.id,
                "estado_id": ciudad.estado_id,
                "nombre": ciudad.nombre,
            }
        )

    return {
        "estado": {
            "id": estado.id,
            "nombre": estado.nombre,
        },
        "ciudades": resultado,
    }
