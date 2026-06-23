from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from modelos.destino_modelo import (
    listar_destinos_catalogo,
    obtener_destino_catalogo,
)
from modelos.viaje_modelo import (
    estadisticas_catalogo,
    listar_viajes_catalogo,
    obtener_viaje_catalogo,
)

router = APIRouter(prefix="/catalogo", tags=["Catálogo público"])


@router.get("/estadisticas")
def estadisticas_catalogo_endpoint(db: Session = Depends(get_db)):
    return estadisticas_catalogo(db)


@router.get("/destinos")
def listar_destinos_catalogo_endpoint(db: Session = Depends(get_db)):
    return listar_destinos_catalogo(db)


@router.get("/destinos/{destino_id}")
def obtener_destino_catalogo_endpoint(destino_id: int, db: Session = Depends(get_db)):
    return obtener_destino_catalogo(db, destino_id)


@router.get("/viajes")
def listar_viajes_catalogo_endpoint(
    destino_id: int | None = Query(default=None),
    mes: str | None = Query(default=None, description="Formato YYYY-MM"),
    desde: datetime | None = Query(default=None),
    hasta: datetime | None = Query(default=None),
    db: Session = Depends(get_db),
):
    return listar_viajes_catalogo(
        db,
        destino_id=destino_id,
        mes=mes,
        desde=desde,
        hasta=hasta,
    )


@router.get("/viajes/{viaje_id}")
def obtener_viaje_catalogo_endpoint(viaje_id: int, db: Session = Depends(get_db)):
    return obtener_viaje_catalogo(db, viaje_id)
