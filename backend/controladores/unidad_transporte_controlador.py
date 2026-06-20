from typing import Optional

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from dependencias.permiso_dependencia import requiere_permiso
from utilidades.bitacora_utilidad import obtener_ip_origen, registrar_evento
from utilidades.permisos_constantes import (
    PERMISO_BORRAR_TRANSPORTE_FLOTA,
    PERMISO_CREAR_TRANSPORTE_FLOTA,
    PERMISO_EDITAR_TRANSPORTE_FLOTA,
    PERMISO_LEER_TRANSPORTE_FLOTA,
)
from utilidades.unidad_transporte_utilidad import (
    actualizar_unidad,
    crear_unidad,
    eliminar_unidad,
    listar_unidades,
    obtener_unidad_activa,
    unidad_a_dict,
)

router = APIRouter(prefix="/unidades", tags=["Flota - Unidades de Transporte"])


class DatosUnidadCrear(BaseModel):
    placa: str
    modelo: Optional[str] = None
    capacidad: int


class DatosUnidadActualizar(BaseModel):
    placa: Optional[str] = None
    modelo: Optional[str] = None
    capacidad: Optional[int] = None


@router.get("")
def listar_unidades_endpoint(
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_TRANSPORTE_FLOTA)),
):
    return listar_unidades(db)


@router.post("")
def crear_unidad_endpoint(
    datos: DatosUnidadCrear,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_CREAR_TRANSPORTE_FLOTA)),
):
    nueva_unidad = crear_unidad(
        db,
        placa=datos.placa,
        modelo=datos.modelo,
        capacidad=datos.capacidad,
    )

    registrar_evento(
        db, modulo="viajes", accion="INSERT",
        resumen=f"Unidad de transporte creada (Placa: {datos.placa})",
        usuario_id=usuario_actual["id"], tabla_afectada="unidades_transporte",
        registro_id=nueva_unidad.id, ip_origen=obtener_ip_origen(request),
    )

    return {"mensaje": "Unidad de transporte creada con éxito", "unidad_id": nueva_unidad.id}


@router.get("/{unidad_id}")
def obtener_unidad(
    unidad_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_TRANSPORTE_FLOTA)),
):
    unidad = obtener_unidad_activa(db, unidad_id)
    return unidad_a_dict(unidad)


@router.put("/{unidad_id}")
def actualizar_unidad_endpoint(
    unidad_id: int,
    datos: DatosUnidadActualizar,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_TRANSPORTE_FLOTA)),
):
    actualizar_unidad(
        db,
        unidad_id,
        placa=datos.placa,
        modelo=datos.modelo,
        capacidad=datos.capacidad,
    )

    registrar_evento(
        db, modulo="viajes", accion="UPDATE",
        resumen=f"Unidad de transporte {unidad_id} actualizada",
        usuario_id=usuario_actual["id"], tabla_afectada="unidades_transporte",
        registro_id=unidad_id, ip_origen=obtener_ip_origen(request),
    )

    return {"mensaje": "Unidad de transporte actualizada con éxito"}


@router.delete("/{unidad_id}")
def eliminar_unidad_endpoint(
    unidad_id: int,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_BORRAR_TRANSPORTE_FLOTA)),
):
    eliminar_unidad(db, unidad_id)

    registrar_evento(
        db, modulo="viajes", accion="DELETE",
        resumen=f"Unidad de transporte {unidad_id} eliminada",
        usuario_id=usuario_actual["id"], tabla_afectada="unidades_transporte",
        registro_id=unidad_id, ip_origen=obtener_ip_origen(request),
    )

    return {"mensaje": "Unidad de transporte eliminada con éxito"}
