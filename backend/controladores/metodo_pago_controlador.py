from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from dependencias.permiso_dependencia import requiere_permiso
from modelos.metodo_pago_modelo import MetodoPago
from modelos.moneda_modelo import Moneda
from modelos.pago_modelo import Pago
from utilidades.pago_utilidad import metodo_pago_a_dict, moneda_a_dict
from utilidades.permisos_constantes import (
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


def _buscar_metodo(db: Session, metodo_id: int) -> MetodoPago:
    metodo = db.query(MetodoPago).filter(MetodoPago.id == metodo_id).first()
    if not metodo:
        raise HTTPException(status_code=404, detail="Metodo de pago no encontrado")
    return metodo


def _validar_moneda(db: Session, moneda_id: int) -> Moneda:
    moneda = db.query(Moneda).filter(Moneda.id == moneda_id).first()
    if not moneda:
        raise HTTPException(status_code=400, detail="Moneda invalida")
    return moneda


def _metodo_a_respuesta(db: Session, metodo: MetodoPago) -> dict:
    moneda = db.query(Moneda).filter(Moneda.id == metodo.moneda_id).first()
    if not moneda:
        raise HTTPException(status_code=500, detail="Moneda del metodo no encontrada")
    return metodo_pago_a_dict(metodo, moneda)


@router.get("")
def listar_metodos_pago(
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_REPORTES_PAGO)),
):
    metodos = db.query(MetodoPago).order_by(MetodoPago.nombre).all()
    resultado = []
    for metodo in metodos:
        resultado.append(_metodo_a_respuesta(db, metodo))
    return resultado


@router.get("/{metodo_id}")
def obtener_metodo_pago(
    metodo_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_REPORTES_PAGO)),
):
    metodo = _buscar_metodo(db, metodo_id)
    return _metodo_a_respuesta(db, metodo)


@router.post("")
def crear_metodo_pago(
    datos: DatosMetodoPagoNuevo,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_CREAR_REPORTES_PAGO)),
):
    _validar_moneda(db, datos.moneda_id)
    codigo = datos.codigo.strip().lower()
    existe = db.query(MetodoPago).filter(MetodoPago.codigo == codigo).first()
    if existe:
        raise HTTPException(status_code=400, detail="Ya existe un metodo de pago con ese codigo")

    nuevo = MetodoPago(codigo=codigo, nombre=datos.nombre.strip(), moneda_id=datos.moneda_id)
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return {"mensaje": "Metodo de pago creado", "metodo_pago": _metodo_a_respuesta(db, nuevo)}


@router.put("/{metodo_id}")
def actualizar_metodo_pago(
    metodo_id: int,
    datos: DatosMetodoPagoActualizar,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_REPORTES_PAGO)),
):
    metodo = _buscar_metodo(db, metodo_id)

    if datos.moneda_id is not None:
        _validar_moneda(db, datos.moneda_id)
        metodo.moneda_id = datos.moneda_id

    if datos.codigo is not None:
        codigo = datos.codigo.strip().lower()
        repetido = db.query(MetodoPago).filter(MetodoPago.codigo == codigo, MetodoPago.id != metodo_id).first()
        if repetido:
            raise HTTPException(status_code=400, detail="Ya existe otro metodo con ese codigo")
        metodo.codigo = codigo

    if datos.nombre is not None:
        metodo.nombre = datos.nombre.strip()

    db.commit()
    db.refresh(metodo)
    return {"mensaje": "Metodo de pago actualizado", "metodo_pago": _metodo_a_respuesta(db, metodo)}


@router.delete("/{metodo_id}")
def eliminar_metodo_pago(
    metodo_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_BORRAR_REPORTES_PAGO)),
):
    metodo = _buscar_metodo(db, metodo_id)
    en_pago = db.query(Pago).filter(Pago.metodo_pago_id == metodo_id, Pago.eliminado_en.is_(None)).first()
    if en_pago:
        raise HTTPException(status_code=400, detail="No se puede eliminar: el metodo tiene pagos registrados")

    db.delete(metodo)
    db.commit()
    return {"mensaje": "Metodo de pago eliminado"}
