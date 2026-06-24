from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from dependencias.permiso_dependencia import requiere_permiso
from modelos.metodo_pago_modelo import (
    actualizar_metodo_pago,
    crear_metodo_pago,
    eliminar_metodo_pago,
    listar_metodos_pago,
    metodo_pago_a_respuesta,
    obtener_metodo_pago,
)
from modelos.permiso_modelo import (
    PERMISO_BORRAR_REPORTES_PAGO,
    PERMISO_CREAR_REPORTES_PAGO,
    PERMISO_EDITAR_REPORTES_PAGO,
    PERMISO_LEER_REPORTES_PAGO,
)

router = APIRouter(prefix="/metodos-pago", tags=["Metodos de pago"])


class DatosMetodoPagoNuevo(BaseModel):
    codigo: str
    nombre: str
    moneda_id: int


class DatosMetodoPagoActualizar(BaseModel):
    codigo: str | None = None
    nombre: str | None = None
    moneda_id: int | None = None


@router.get("")
def listar_metodos_pago_endpoint(
    pagina: int = Query(default=1, ge=1),
    limite: int = Query(default=10, ge=1, le=200),
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_REPORTES_PAGO)),
):
    return listar_metodos_pago(db, pagina=pagina, limite=limite)


@router.get("/{metodo_id}")
def obtener_metodo_pago_endpoint(
    metodo_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_REPORTES_PAGO)),
):
    metodo = obtener_metodo_pago(db, metodo_id)
    return metodo_pago_a_respuesta(db, metodo)


@router.post("")
def crear_metodo_pago_endpoint(
    datos: DatosMetodoPagoNuevo,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_CREAR_REPORTES_PAGO)),
):
    nuevo = crear_metodo_pago(db, datos.codigo, datos.nombre, datos.moneda_id)
    return {"mensaje": "Metodo de pago creado", "metodo_pago": metodo_pago_a_respuesta(db, nuevo)}


@router.put("/{metodo_id}")
def actualizar_metodo_pago_endpoint(
    metodo_id: int,
    datos: DatosMetodoPagoActualizar,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_REPORTES_PAGO)),
):
    metodo = actualizar_metodo_pago(db, metodo_id, datos.codigo, datos.nombre, datos.moneda_id)
    return {"mensaje": "Metodo de pago actualizado", "metodo_pago": metodo_pago_a_respuesta(db, metodo)}


@router.delete("/{metodo_id}")
def eliminar_metodo_pago_endpoint(
    metodo_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_BORRAR_REPORTES_PAGO)),
):
    eliminar_metodo_pago(db, metodo_id)
    return {"mensaje": "Metodo de pago eliminado"}
