from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from dependencias.permiso_dependencia import requiere_permiso
from utilidades.finanzas_utilidad import (
    actualizar_punto_venta,
    crear_punto_venta,
    eliminar_punto_venta,
    listar_puntos_venta,
    obtener_punto_venta_activo,
    punto_venta_a_respuesta,
)
from utilidades.permisos_constantes import (
    PERMISO_BORRAR_REPORTES_PAGO,
    PERMISO_CREAR_REPORTES_PAGO,
    PERMISO_EDITAR_REPORTES_PAGO,
    PERMISO_LEER_REPORTES_PAGO,
)

router = APIRouter(prefix="/puntos-venta", tags=["Puntos de venta"])


class DatosPuntoVentaNuevo(BaseModel):
    banco_id: int
    codigo: str
    nombre: str
    numero_terminal: str | None = None
    activo: bool = True


class DatosPuntoVentaActualizar(BaseModel):
    banco_id: int | None = None
    codigo: str | None = None
    nombre: str | None = None
    numero_terminal: str | None = None
    activo: bool | None = None


@router.get("")
def listar_puntos_venta_endpoint(
    banco_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_REPORTES_PAGO)),
):
    return listar_puntos_venta(db, banco_id=banco_id)


@router.get("/{punto_id}")
def obtener_punto_venta_endpoint(
    punto_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_REPORTES_PAGO)),
):
    punto = obtener_punto_venta_activo(db, punto_id)
    return punto_venta_a_respuesta(db, punto)


@router.post("")
def crear_punto_venta_endpoint(
    datos: DatosPuntoVentaNuevo,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_CREAR_REPORTES_PAGO)),
):
    nuevo = crear_punto_venta(
        db,
        datos.banco_id,
        datos.codigo,
        datos.nombre,
        datos.numero_terminal,
        datos.activo,
    )
    return {"mensaje": "Punto de venta creado", "punto_venta": punto_venta_a_respuesta(db, nuevo)}


@router.put("/{punto_id}")
def actualizar_punto_venta_endpoint(
    punto_id: int,
    datos: DatosPuntoVentaActualizar,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_REPORTES_PAGO)),
):
    punto = actualizar_punto_venta(
        db,
        punto_id,
        datos.banco_id,
        datos.codigo,
        datos.nombre,
        datos.numero_terminal,
        datos.activo,
    )
    return {"mensaje": "Punto de venta actualizado", "punto_venta": punto_venta_a_respuesta(db, punto)}


@router.delete("/{punto_id}")
def eliminar_punto_venta_endpoint(
    punto_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_BORRAR_REPORTES_PAGO)),
):
    eliminar_punto_venta(db, punto_id)
    return {"mensaje": "Punto de venta eliminado"}
