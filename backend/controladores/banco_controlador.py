from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from dependencias.permiso_dependencia import requiere_permiso
from utilidades.finanzas_utilidad import (
    actualizar_banco,
    crear_banco,
    eliminar_banco,
    listar_bancos,
    obtener_banco_activo,
)
from utilidades.pago_utilidad import banco_a_dict
from utilidades.permisos_constantes import (
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
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_REPORTES_PAGO)),
):
    return listar_bancos(db)


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
