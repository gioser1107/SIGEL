from typing import Optional

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from dependencias.permiso_dependencia import requiere_permiso
from modelos.asiento_modelo import (
    actualizar_asiento,
    aplicar_plantilla_croquis,
    crear_asiento,
    eliminar_asiento,
    listar_asientos,
)
from modelos.bitacora_modelo import obtener_ip_origen, registrar_evento
from modelos.permiso_modelo import (
    PERMISO_BORRAR_TRANSPORTE_FLOTA,
    PERMISO_CREAR_TRANSPORTE_FLOTA,
    PERMISO_EDITAR_TRANSPORTE_FLOTA,
    PERMISO_LEER_TRANSPORTE_FLOTA,
)

router = APIRouter(prefix="/asientos", tags=["Asientos de Transporte"])


class DatosAsientoCrear(BaseModel):
    unidad_id: int
    numero: str
    posicion: str = "otro"
    fila: Optional[int] = None
    columna: Optional[int] = None


class DatosAsientoActualizar(BaseModel):
    numero: Optional[str] = None
    posicion: Optional[str] = None
    fila: Optional[int] = None
    columna: Optional[int] = None


class DatosPlantillaCroquis(BaseModel):
    unidad_id: int
    plantilla: str = "travel_bqto"


@router.get("")
def listar_asientos_endpoint(
    unidad_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_TRANSPORTE_FLOTA)),
):
    return listar_asientos(db, unidad_id)


@router.post("/plantilla")
def aplicar_plantilla_croquis_endpoint(
    datos: DatosPlantillaCroquis,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_CREAR_TRANSPORTE_FLOTA)),
):
    resultado = aplicar_plantilla_croquis(db, datos.unidad_id, datos.plantilla)

    registrar_evento(
        db, modulo="viajes", accion="UPDATE",
        resumen=f"Croquis {datos.plantilla} aplicado a unidad {datos.unidad_id}",
        usuario_id=usuario_actual["id"], tabla_afectada="asientos",
        registro_id=datos.unidad_id, ip_origen=obtener_ip_origen(request),
    )

    return resultado


@router.post("")
def crear_asiento_endpoint(
    datos: DatosAsientoCrear,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_CREAR_TRANSPORTE_FLOTA)),
):
    nuevo_asiento = crear_asiento(
        db,
        unidad_id=datos.unidad_id,
        numero=datos.numero,
        posicion=datos.posicion,
        fila=datos.fila,
        columna=datos.columna,
    )

    registrar_evento(
        db, modulo="viajes", accion="INSERT",
        resumen=f"Asiento {datos.numero} creado para unidad {datos.unidad_id}",
        usuario_id=usuario_actual["id"], tabla_afectada="asientos",
        registro_id=nuevo_asiento.id, ip_origen=obtener_ip_origen(request),
    )

    return {"mensaje": "Asiento creado", "asiento_id": nuevo_asiento.id}


@router.put("/{asiento_id}")
def actualizar_asiento_endpoint(
    asiento_id: int,
    datos: DatosAsientoActualizar,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_TRANSPORTE_FLOTA)),
):
    actualizar_coordenadas = "fila" in datos.model_fields_set or "columna" in datos.model_fields_set
    actualizar_asiento(
        db,
        asiento_id,
        numero=datos.numero,
        posicion=datos.posicion,
        fila=datos.fila,
        columna=datos.columna,
        actualizar_coordenadas=actualizar_coordenadas,
    )

    registrar_evento(
        db, modulo="viajes", accion="UPDATE",
        resumen=f"Asiento {asiento_id} actualizado",
        usuario_id=usuario_actual["id"], tabla_afectada="asientos",
        registro_id=asiento_id, ip_origen=obtener_ip_origen(request),
    )

    return {"mensaje": "Asiento actualizado"}


@router.delete("/{asiento_id}")
def eliminar_asiento_endpoint(
    asiento_id: int,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_BORRAR_TRANSPORTE_FLOTA)),
):
    eliminar_asiento(db, asiento_id)

    registrar_evento(
        db, modulo="viajes", accion="DELETE",
        resumen=f"Asiento {asiento_id} eliminado",
        usuario_id=usuario_actual["id"], tabla_afectada="asientos",
        registro_id=asiento_id, ip_origen=obtener_ip_origen(request),
    )

    return {"mensaje": "Asiento eliminado"}
