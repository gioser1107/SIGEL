from typing import Optional

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from dependencias.permiso_dependencia import requiere_permiso
from utilidades.asiento_utilidad import (
    actualizar_asiento,
    crear_asiento,
    eliminar_asiento,
    listar_asientos,
)
from utilidades.bitacora_utilidad import obtener_ip_origen, registrar_evento
from utilidades.permisos_constantes import (
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


class DatosAsientoActualizar(BaseModel):
    numero: Optional[str] = None
    posicion: Optional[str] = None


@router.get("")
def listar_asientos_endpoint(
    unidad_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_TRANSPORTE_FLOTA)),
):
    return listar_asientos(db, unidad_id)


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
    )

    registrar_evento(
        db, modulo="flota", accion="INSERT",
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
    actualizar_asiento(db, asiento_id, numero=datos.numero, posicion=datos.posicion)

    registrar_evento(
        db, modulo="flota", accion="UPDATE",
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
        db, modulo="flota", accion="DELETE",
        resumen=f"Asiento {asiento_id} eliminado",
        usuario_id=usuario_actual["id"], tabla_afectada="asientos",
        registro_id=asiento_id, ip_origen=obtener_ip_origen(request),
    )

    return {"mensaje": "Asiento eliminado"}
