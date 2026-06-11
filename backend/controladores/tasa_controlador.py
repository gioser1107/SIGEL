from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from dependencias.permiso_dependencia import requiere_alguno_de_permisos, requiere_permiso
from modelos.moneda_modelo import Moneda
from modelos.pago_modelo import Pago
from modelos.tasa_modelo import Tasa
from utilidades.pago_utilidad import moneda_a_dict, obtener_tasa_eur_del_dia, tasa_a_dict
from utilidades.permisos_constantes import (
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

def _buscar_tasa(db: Session, tasa_id: int) -> Tasa:
    tasa = db.query(Tasa).filter(Tasa.id == tasa_id).first()
    if not tasa:
        raise HTTPException(status_code=404, detail="Tasa no encontrada")
    return tasa

def _validar_moneda(db: Session, moneda_id: int) -> Moneda:
    moneda = db.query(Moneda).filter(Moneda.id == moneda_id).first()
    if not moneda:
        raise HTTPException(status_code=400, detail="Moneda invalida")
    return moneda

def _tasa_a_respuesta(db: Session, tasa: Tasa) -> dict:
    moneda = db.query(Moneda).filter(Moneda.id == tasa.moneda_id).first()
    if not moneda:
        raise HTTPException(status_code=500, detail="Moneda de la tasa no encontrada")
    return tasa_a_dict(tasa, moneda)

@router.get("")
def listar_tasas(
    moneda_id: int | None = Query(default=None),
    fecha: date | None = Query(default=None),
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_REPORTES_PAGO)),
):
    consulta = db.query(Tasa)
    if moneda_id is not None:
        consulta = consulta.filter(Tasa.moneda_id == moneda_id)
    if fecha is not None:
        consulta = consulta.filter(Tasa.fecha == fecha)

    tasas = consulta.order_by(Tasa.fecha.desc(), Tasa.id.desc()).all()
    return [_tasa_a_respuesta(db, t) for t in tasas]

@router.get("/del-dia")
def obtener_tasa_del_dia(
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(
        requiere_alguno_de_permisos(PERMISO_LEER_REPORTES_PAGO, PERMISO_LEER_RESERVAS)
    ),
):
    resultado = obtener_tasa_eur_del_dia(db)
    if resultado is None:
        raise HTTPException(status_code=404, detail="No hay tasa EUR registrada en el sistema")
    return resultado

@router.get("/hoy")
def obtener_tasas_hoy(
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_REPORTES_PAGO)),
):
    hoy = date.today()
    tasas = db.query(Tasa).filter(Tasa.fecha == hoy).order_by(Tasa.id.desc()).all()
    return [_tasa_a_respuesta(db, t) for t in tasas]

@router.get("/{tasa_id}")
def obtener_tasa(
    tasa_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_REPORTES_PAGO)),
):
    tasa = _buscar_tasa(db, tasa_id)
    return _tasa_a_respuesta(db, tasa)

@router.post("")
def crear_tasa(
    datos: DatosTasaNueva,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_CREAR_REPORTES_PAGO)),
):
    _validar_moneda(db, datos.moneda_id)

    nueva = Tasa(fecha=datos.fecha, valor=datos.valor, moneda_id=datos.moneda_id)
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return {"mensaje": "Tasa creada", "tasa": _tasa_a_respuesta(db, nueva)}

@router.put("/{tasa_id}")
def actualizar_tasa(
    tasa_id: int,
    datos: DatosTasaActualizar,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_REPORTES_PAGO)),
):
    tasa = _buscar_tasa(db, tasa_id)

    if datos.moneda_id is not None:
        _validar_moneda(db, datos.moneda_id)
        tasa.moneda_id = datos.moneda_id

    if datos.fecha is not None:
        tasa.fecha = datos.fecha

    if datos.valor is not None:
        tasa.valor = datos.valor

    db.commit()
    db.refresh(tasa)
    return {"mensaje": "Tasa actualizada", "tasa": _tasa_a_respuesta(db, tasa)}

@router.delete("/{tasa_id}")
def eliminar_tasa(
    tasa_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_BORRAR_REPORTES_PAGO)),
):
    tasa = _buscar_tasa(db, tasa_id)
    en_pago = db.query(Pago).filter(Pago.tasa_id == tasa_id, Pago.eliminado_en.is_(None)).first()
    if en_pago:
        raise HTTPException(status_code=400, detail="No se puede eliminar: la tasa esta en uso por un pago")

    db.delete(tasa)
    db.commit()
    return {"mensaje": "Tasa eliminada"}
