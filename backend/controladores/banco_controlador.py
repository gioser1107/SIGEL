from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from dependencias.permiso_dependencia import requiere_permiso
from modelos.banco_modelo import (
    actualizar_banco,
    banco_a_dict,
    crear_banco,
    eliminar_banco,
    listar_bancos,
    obtener_banco_activo,
)
from modelos.permiso_modelo import (
    PERMISO_BORRAR_REPORTES_PAGO,
    PERMISO_CREAR_REPORTES_PAGO,
    PERMISO_EDITAR_REPORTES_PAGO,
    PERMISO_LEER_REPORTES_PAGO,
)

router = APIRouter(prefix="/bancos", tags=["Bancos"])


class DatosBancoNuevo(BaseModel):
    codigo: str
    nombre: str
    activo: bool = True


class DatosBancoActualizar(BaseModel):
    codigo: str | None = None
    nombre: str | None = None
    activo: bool | None = None


@router.get("")
def listar_bancos_endpoint(
    pagina: int = Query(default=1, ge=1),
    limite: int = Query(default=10, ge=1, le=200),
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_REPORTES_PAGO)),
):
    return listar_bancos(db, pagina=pagina, limite=limite)


@router.get("/{banco_id}")
def obtener_banco_endpoint(
    banco_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_REPORTES_PAGO)),
):
    banco = obtener_banco_activo(db, banco_id)
    return banco_a_dict(banco)


@router.post("")
def crear_banco_endpoint(
    datos: DatosBancoNuevo,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_CREAR_REPORTES_PAGO)),
):
    nuevo = crear_banco(db, datos.codigo, datos.nombre, datos.activo)
    return {"mensaje": "Banco creado", "banco": banco_a_dict(nuevo)}


@router.put("/{banco_id}")
def actualizar_banco_endpoint(
    banco_id: int,
    datos: DatosBancoActualizar,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_REPORTES_PAGO)),
):
    banco = actualizar_banco(db, banco_id, datos.codigo, datos.nombre, datos.activo)
    return {"mensaje": "Banco actualizado", "banco": banco_a_dict(banco)}


@router.delete("/{banco_id}")
def eliminar_banco_endpoint(
    banco_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_BORRAR_REPORTES_PAGO)),
):
    eliminar_banco(db, banco_id)
    return {"mensaje": "Banco eliminado"}
