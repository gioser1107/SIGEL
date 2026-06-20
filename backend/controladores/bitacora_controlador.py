from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from dependencias.auth_dependencia import obtener_usuario_actual
from utilidades.bitacora_utilidad import (
    listar_bitacora,
    obtener_detalle_bitacora,
    verificar_permiso_bitacora,
)

router = APIRouter(prefix="/bitacora", tags=["Bitácora"])


@router.get("")
def listar_bitacora_endpoint(
    modulo: str | None = Query(default=None),
    accion: str | None = Query(default=None),
    usuario_id: int | None = Query(default=None),
    fecha_desde: datetime | None = Query(default=None),
    fecha_hasta: datetime | None = Query(default=None),
    q: str | None = Query(default=None),
    limite: int = Query(default=50, ge=1, le=200),
    pagina: int = Query(default=1, ge=1),
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    verificar_permiso_bitacora(usuario_actual)
    return listar_bitacora(
        db,
        modulo=modulo,
        accion=accion,
        usuario_id=usuario_id,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
        q=q,
        limite=limite,
        pagina=pagina,
    )


@router.get("/{entrada_id}")
def obtener_detalle_bitacora_endpoint(
    entrada_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    verificar_permiso_bitacora(usuario_actual)
    return obtener_detalle_bitacora(db, entrada_id)
