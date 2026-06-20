from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from dependencias.permiso_dependencia import requiere_alguno_de_permisos, requiere_permiso
from modelos.tasa_modelo import (
    actualizar_tasa,
    crear_tasa,
    eliminar_tasa,
    listar_tasas,
    listar_tasas_hoy,
    obtener_tasa,
    obtener_tasa_eur_del_dia_o_error,
    tasa_a_respuesta,
)
from modelos.permiso_modelo import (
    PERMISO_BORRAR_REPORTES_PAGO,
    PERMISO_CREAR_REPORTES_PAGO,
    PERMISO_EDITAR_REPORTES_PAGO,
    PERMISO_LEER_REPORTES_PAGO,
    PERMISO_LEER_RESERVAS,
)

router = APIRouter(prefix="/tasas", tags=["Tasas"])


class DatosTasaNueva(BaseModel):
    fecha: date
    valor: Decimal = Field(gt=0)
    moneda_id: int


class DatosTasaActualizar(BaseModel):
    fecha: date | None = None
    valor: Decimal | None = Field(default=None, gt=0)
    moneda_id: int | None = None


@router.get("")
def listar_tasas_endpoint(
    moneda_id: int | None = Query(default=None),
    fecha: date | None = Query(default=None),
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_REPORTES_PAGO)),
):
    return listar_tasas(db, moneda_id=moneda_id, fecha=fecha)


@router.get("/del-dia")
def obtener_tasa_del_dia(
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(
        requiere_alguno_de_permisos(PERMISO_LEER_REPORTES_PAGO, PERMISO_LEER_RESERVAS)
    ),
):
    return obtener_tasa_eur_del_dia_o_error(db)


@router.get("/hoy")
def obtener_tasas_hoy_endpoint(
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_REPORTES_PAGO)),
):
    return listar_tasas_hoy(db)


@router.get("/{tasa_id}")
def obtener_tasa_endpoint(
    tasa_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_REPORTES_PAGO)),
):
    tasa = obtener_tasa(db, tasa_id)
    return tasa_a_respuesta(db, tasa)


@router.post("")
def crear_tasa_endpoint(
    datos: DatosTasaNueva,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_CREAR_REPORTES_PAGO)),
):
    nueva = crear_tasa(db, datos.fecha, datos.valor, datos.moneda_id)
    return {"mensaje": "Tasa creada", "tasa": tasa_a_respuesta(db, nueva)}


@router.put("/{tasa_id}")
def actualizar_tasa_endpoint(
    tasa_id: int,
    datos: DatosTasaActualizar,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_REPORTES_PAGO)),
):
    tasa = actualizar_tasa(db, tasa_id, datos.fecha, datos.valor, datos.moneda_id)
    return {"mensaje": "Tasa actualizada", "tasa": tasa_a_respuesta(db, tasa)}


@router.delete("/{tasa_id}")
def eliminar_tasa_endpoint(
    tasa_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_BORRAR_REPORTES_PAGO)),
):
    eliminar_tasa(db, tasa_id)
    return {"mensaje": "Tasa eliminada"}
