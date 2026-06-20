from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from modelos.ciudad_modelo import listar_ciudades_por_estado
from modelos.estado_modelo import listar_estados

router = APIRouter(prefix="/ubicaciones", tags=["Ubicaciones"])


@router.get("/estados")
def listar_estados_endpoint(db: Session = Depends(get_db)):
    return listar_estados(db)


@router.get("/estados/{estado_id}/ciudades")
def listar_ciudades_por_estado_endpoint(estado_id: int, db: Session = Depends(get_db)):
    return listar_ciudades_por_estado(db, estado_id)
