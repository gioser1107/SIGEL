from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from dependencias.permiso_dependencia import requiere_permiso
from modelos.permiso_modelo import PERMISO_LEER_PUNTOS_RECOGIDA
from modelos.punto_recogida_modelo import (
    listar_domicilios_recogida,
    listar_puntos_por_cliente,
    obtener_domicilio_recogida,
)

router = APIRouter(
    prefix="/puntos-recogida",
    tags=["Puntos de recogida (solo consulta)"],
)


@router.get("")
def listar_domicilios_recogida_endpoint(
    cliente_id: int | None = Query(default=None, description="Filtrar por cliente"),
    buscar: str | None = Query(
        default=None,
        description="Buscar por nombre, dirección, ciudad, cliente o documento",
    ),
    solo_activos: bool = Query(default=True),
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_PUNTOS_RECOGIDA)),
):
    """
    Consulta de domicilios de recogida vinculados a clientes.

    Solo lectura. Para crear, editar o eliminar domicilios use:
    - Admin: POST/PUT/DELETE /api/clientes/{cliente_id}/puntos-recogida
    - Cliente: /api/clientes/mi-perfil/puntos-recogida
    """
    return listar_domicilios_recogida(
        db,
        cliente_id=cliente_id,
        buscar=buscar,
        solo_activos=solo_activos,
    )


@router.get("/cliente/{cliente_id}")
def listar_domicilios_por_cliente_endpoint(
    cliente_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_PUNTOS_RECOGIDA)),
):
    domicilios = listar_puntos_por_cliente(db, cliente_id)
    return {
        "cliente_id": cliente_id,
        "total": len(domicilios),
        "domicilios": domicilios,
    }


@router.get("/{punto_recogida_id}")
def obtener_domicilio_recogida_endpoint(
    punto_recogida_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_PUNTOS_RECOGIDA)),
):
    return obtener_domicilio_recogida(db, punto_recogida_id)
