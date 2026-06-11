from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from dependencias.permiso_dependencia import requiere_permiso
from modelos.banco_modelo import Banco
from modelos.pago_modelo import Pago
from modelos.punto_venta_modelo import PuntoVenta
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

def _buscar_banco_activo(db: Session, banco_id: int) -> Banco:
    banco = db.query(Banco).filter(Banco.id == banco_id, Banco.eliminado_en.is_(None)).first()
    if not banco:
        raise HTTPException(status_code=404, detail="Banco no encontrado")
    return banco

@router.get("")
def listar_bancos(
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_REPORTES_PAGO)),
):
    bancos = (
        db.query(Banco)
        .filter(Banco.eliminado_en.is_(None))
        .order_by(Banco.nombre)
        .all()
    )
    return [banco_a_dict(b) for b in bancos]

@router.get("/{banco_id}")
def obtener_banco(
    banco_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_REPORTES_PAGO)),
):
    banco = _buscar_banco_activo(db, banco_id)
    return banco_a_dict(banco)

@router.post("")
def crear_banco(
    datos: DatosBancoNuevo,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_CREAR_REPORTES_PAGO)),
):
    codigo = datos.codigo.strip()
    existe = db.query(Banco).filter(Banco.codigo == codigo, Banco.eliminado_en.is_(None)).first()
    if existe:
        raise HTTPException(status_code=400, detail="Ya existe un banco con ese codigo")

    ahora = datetime.now()
    nuevo = Banco(
        codigo=codigo,
        nombre=datos.nombre.strip(),
        activo=datos.activo,
        creado_en=ahora,
        actualizado_en=ahora,
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return {"mensaje": "Banco creado", "banco": banco_a_dict(nuevo)}

@router.put("/{banco_id}")
def actualizar_banco(
    banco_id: int,
    datos: DatosBancoActualizar,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_REPORTES_PAGO)),
):
    banco = _buscar_banco_activo(db, banco_id)

    if datos.codigo is not None:
        codigo = datos.codigo.strip()
        repetido = db.query(Banco).filter(
            Banco.codigo == codigo,
            Banco.id != banco_id,
            Banco.eliminado_en.is_(None),
        ).first()
        if repetido:
            raise HTTPException(status_code=400, detail="Ya existe otro banco con ese codigo")
        banco.codigo = codigo

    if datos.nombre is not None:
        banco.nombre = datos.nombre.strip()

    if datos.activo is not None:
        banco.activo = datos.activo

    banco.actualizado_en = datetime.now()
    db.commit()
    db.refresh(banco)
    return {"mensaje": "Banco actualizado", "banco": banco_a_dict(banco)}

@router.delete("/{banco_id}")
def eliminar_banco(
    banco_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_BORRAR_REPORTES_PAGO)),
):
    banco = _buscar_banco_activo(db, banco_id)

    en_punto = db.query(PuntoVenta).filter(
        PuntoVenta.banco_id == banco_id,
        PuntoVenta.eliminado_en.is_(None),
    ).first()
    if en_punto:
        raise HTTPException(status_code=400, detail="No se puede eliminar: el banco tiene puntos de venta")

    en_pago = db.query(Pago).filter(
        (Pago.banco_origen_id == banco_id) | (Pago.banco_destino_id == banco_id),
        Pago.eliminado_en.is_(None),
    ).first()
    if en_pago:
        raise HTTPException(status_code=400, detail="No se puede eliminar: el banco esta en pagos registrados")

    ahora = datetime.now()
    banco.eliminado_en = ahora
    banco.actualizado_en = ahora
    db.commit()
    return {"mensaje": "Banco eliminado"}
