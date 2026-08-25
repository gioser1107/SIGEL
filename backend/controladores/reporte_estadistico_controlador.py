from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from dependencias.permiso_dependencia import requiere_alguno_de_permisos
from modelos.permiso_modelo import (
    PERMISO_LEER_CLIENTES,
    PERMISO_LEER_REPORTES_PAGO,
    PERMISO_LEER_RESERVAS,
)
from modelos.reporte_estadistico_modelo import generar_reporte_estadistico

router = APIRouter(prefix="/reportes", tags=["Reportes estadísticos"])


@router.get("/estadisticos")
def obtener_reporte_estadistico(
    desde: date | None = Query(default=None, description="Fecha inicial (YYYY-MM-DD)"),
    hasta: date | None = Query(default=None, description="Fecha final (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    _usuario: dict = Depends(
        requiere_alguno_de_permisos(
            PERMISO_LEER_RESERVAS,
            PERMISO_LEER_REPORTES_PAGO,
            PERMISO_LEER_CLIENTES,
        )
    ),
):
    return generar_reporte_estadistico(db, desde, hasta)
