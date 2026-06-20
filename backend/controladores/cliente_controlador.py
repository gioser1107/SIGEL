from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from dependencias.permiso_dependencia import requiere_permiso
from utilidades.cliente_utilidad import (
    actualizar_cliente as actualizar_cliente_util,
    crear_cliente as crear_cliente_util,
    desactivar_cliente as desactivar_cliente_util,
    listar_clientes as listar_clientes_util,
    obtener_cliente as obtener_cliente_util,
)
from utilidades.permisos_constantes import (
    PERMISO_BORRAR_CLIENTES,
    PERMISO_CREAR_CLIENTES,
    PERMISO_EDITAR_CLIENTES,
    PERMISO_LEER_CLIENTES,
)

router = APIRouter(prefix="/clientes", tags=["Clientes"])


class DatosClienteNuevo(BaseModel):
    nombre: str
    apellido: str
    tipo_cliente: str = "natural"
    tipo_documento: str
    numero_documento: str
    razon_social: str | None = None
    telefono: str | None = None
    telefono_secundario: str | None = None
    direccion: str | None = None
    estado_id: int | None = None
    ciudad_id: int | None = None
    notas: str | None = None


class DatosClienteActualizar(BaseModel):
    nombre: str | None = None
    apellido: str | None = None
    tipo_cliente: str | None = None
    tipo_documento: str | None = None
    numero_documento: str | None = None
    razon_social: str | None = None
    telefono: str | None = None
    telefono_secundario: str | None = None
    direccion: str | None = None
    estado_id: int | None = None
    ciudad_id: int | None = None
    notas: str | None = None


@router.get("/")
def listar_clientes(
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_CLIENTES)),
):
    return listar_clientes_util(db)


@router.get("/{cliente_id}")
def obtener_cliente(
    cliente_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_CLIENTES)),
):
    return obtener_cliente_util(db, cliente_id)


@router.post("/")
def crear_cliente_desde_admin(
    datos: DatosClienteNuevo,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_CREAR_CLIENTES)),
):
    return crear_cliente_util(db, datos, usuario_actual["id"])


@router.put("/{cliente_id}")
def actualizar_cliente(
    cliente_id: int,
    datos: DatosClienteActualizar,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_CLIENTES)),
):
    return actualizar_cliente_util(db, cliente_id, datos, usuario_actual["id"])


@router.delete("/{cliente_id}")
def desactivar_cliente(
    cliente_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_BORRAR_CLIENTES)),
):
    return desactivar_cliente_util(db, cliente_id, usuario_actual["id"])
