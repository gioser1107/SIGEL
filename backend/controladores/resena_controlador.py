from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from dependencias.auth_dependencia import obtener_usuario_actual
from dependencias.permiso_dependencia import requiere_permiso
from modelos.bitacora_modelo import obtener_ip_origen, registrar_evento
from modelos.permiso_modelo import (
    PERMISO_BORRAR_RESENAS,
    PERMISO_EDITAR_RESENAS,
    PERMISO_LEER_RESENAS,
)
from modelos.resena_modelo import (
    alternar_visibilidad,
    crear_resena,
    eliminar_resena,
    listar_resenas_admin,
    listar_resenas_publicas,
    listar_reservas_elegibles_cliente,
    obtener_mi_resena,
)

router = APIRouter(prefix="/resenas", tags=["Reseñas"])


class DatosResenaNueva(BaseModel):
    reserva_id: int
    calificacion: int = Field(ge=1, le=5)
    comentario: Optional[str] = None


def _exigir_cliente_id(usuario_actual: dict) -> int:
    cliente_id = usuario_actual.get("cliente_id")
    if not cliente_id:
        raise HTTPException(status_code=403, detail="Solo clientes registrados pueden gestionar reseñas")
    return int(cliente_id)


@router.get("/publicas")
def listar_resenas_publicas_endpoint(db: Session = Depends(get_db)):
    return listar_resenas_publicas(db)


@router.get("/mis-reservas-elegibles")
def listar_reservas_elegibles_cliente_endpoint(
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    cliente_id = _exigir_cliente_id(usuario_actual)
    return listar_reservas_elegibles_cliente(db, cliente_id)


@router.get("/mi-resena")
def obtener_mi_resena_endpoint(
    reserva_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    cliente_id = _exigir_cliente_id(usuario_actual)
    return obtener_mi_resena(db, reserva_id, cliente_id)


@router.post("")
def crear_resena_endpoint(
    datos: DatosResenaNueva,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    cliente_id = _exigir_cliente_id(usuario_actual)
    nueva = crear_resena(
        db,
        reserva_id=datos.reserva_id,
        cliente_id=cliente_id,
        calificacion=datos.calificacion,
        comentario=datos.comentario,
    )

    registrar_evento(
        db,
        modulo="reservas",
        accion="INSERT",
        resumen=f"Reseña creada para reserva {datos.reserva_id} (cliente {cliente_id})",
        usuario_id=usuario_actual["id"],
        tabla_afectada="resenas",
        registro_id=nueva["id"],
        ip_origen=obtener_ip_origen(request),
    )

    return {"mensaje": "Reseña registrada", "resena": nueva}


@router.get("")
def listar_resenas_admin_endpoint(
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_RESENAS)),
):
    return listar_resenas_admin(db)


@router.patch("/{resena_id}/visibilidad")
def alternar_visibilidad_resena_endpoint(
    resena_id: int,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_RESENAS)),
):
    resena = alternar_visibilidad(db, resena_id)

    registrar_evento(
        db,
        modulo="reservas",
        accion="UPDATE",
        resumen=f"Visibilidad de reseña {resena_id} cambiada a {'pública' if resena['publico'] else 'privada'}",
        usuario_id=usuario_actual["id"],
        tabla_afectada="resenas",
        registro_id=resena_id,
        ip_origen=obtener_ip_origen(request),
    )

    return {"mensaje": "Visibilidad actualizada", "resena": resena}


@router.delete("/{resena_id}")
def eliminar_resena_endpoint(
    resena_id: int,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_BORRAR_RESENAS)),
):
    eliminar_resena(db, resena_id)

    registrar_evento(
        db,
        modulo="reservas",
        accion="DELETE",
        resumen=f"Reseña {resena_id} eliminada",
        usuario_id=usuario_actual["id"],
        tabla_afectada="resenas",
        registro_id=resena_id,
        ip_origen=obtener_ip_origen(request),
    )

    return {"mensaje": "Reseña eliminada"}
