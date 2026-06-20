from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from dependencias.permiso_dependencia import requiere_permiso
from modelos.moneda_modelo import (
    actualizar_moneda,
    crear_moneda,
    eliminar_moneda,
    listar_monedas,
    moneda_a_dict,
    obtener_moneda,
)
from modelos.permiso_modelo import (
    PERMISO_BORRAR_REPORTES_PAGO,
    PERMISO_CREAR_REPORTES_PAGO,
    PERMISO_EDITAR_REPORTES_PAGO,
    PERMISO_LEER_REPORTES_PAGO,
)

router = APIRouter(prefix="/monedas", tags=["Monedas"])


class DatosMonedaNueva(BaseModel):
    codigo: str
    nombre: str
    simbolo: str


class DatosMonedaActualizar(BaseModel):
    codigo: str | None = None
    nombre: str | None = None
    simbolo: str | None = None


@router.get("")
def listar_monedas_endpoint(
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_REPORTES_PAGO)),
):
    return listar_monedas(db)


@router.get("/{moneda_id}")
def obtener_moneda_endpoint(
    moneda_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_REPORTES_PAGO)),
):
    moneda = obtener_moneda(db, moneda_id)
    return moneda_a_dict(moneda)


@router.post("")
def crear_moneda_endpoint(
    datos: DatosMonedaNueva,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_CREAR_REPORTES_PAGO)),
):
    nueva = crear_moneda(db, datos.codigo, datos.nombre, datos.simbolo)
    return {"mensaje": "Moneda creada", "moneda": moneda_a_dict(nueva)}


@router.put("/{moneda_id}")
def actualizar_moneda_endpoint(
    moneda_id: int,
    datos: DatosMonedaActualizar,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_REPORTES_PAGO)),
):
    moneda = actualizar_moneda(db, moneda_id, datos.codigo, datos.nombre, datos.simbolo)
    return {"mensaje": "Moneda actualizada", "moneda": moneda_a_dict(moneda)}


@router.delete("/{moneda_id}")
def eliminar_moneda_endpoint(
    moneda_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_BORRAR_REPORTES_PAGO)),
):
    eliminar_moneda(db, moneda_id)
    return {"mensaje": "Moneda eliminada"}
