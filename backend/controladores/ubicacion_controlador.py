from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from utilidades.ubicacion_utilidad import listar_ciudades_por_estado, listar_estados

router = APIRouter(prefix="/ubicaciones", tags=["Ubicaciones"])


@router.get("/estados")
def listar_estados_endpoint(db: Session = Depends(get_db)):
    return listar_estados(db)


@router.get("/estados/{estado_id}/ciudades")
def listar_ciudades_por_estado_endpoint(estado_id: int, db: Session = Depends(get_db)):
    return listar_ciudades_por_estado(db, estado_id)
