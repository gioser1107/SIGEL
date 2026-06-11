from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from dependencias.permiso_dependencia import requiere_permiso
from modelos.metodo_pago_modelo import MetodoPago
from modelos.moneda_modelo import Moneda
from modelos.tasa_modelo import Tasa
from utilidades.pago_utilidad import moneda_a_dict
from utilidades.permisos_constantes import (
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

def _buscar_moneda(db: Session, moneda_id: int) -> Moneda:
    moneda = db.query(Moneda).filter(Moneda.id == moneda_id).first()
    if not moneda:
        raise HTTPException(status_code=404, detail="Moneda no encontrada")
    return moneda

@router.get("")
def listar_monedas(
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_REPORTES_PAGO)),
):
    monedas = db.query(Moneda).order_by(Moneda.nombre).all()
    return [moneda_a_dict(m) for m in monedas]

@router.get("/{moneda_id}")
def obtener_moneda(
    moneda_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_REPORTES_PAGO)),
):
    moneda = _buscar_moneda(db, moneda_id)
    return moneda_a_dict(moneda)

@router.post("")
def crear_moneda(
    datos: DatosMonedaNueva,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_CREAR_REPORTES_PAGO)),
):
    codigo = datos.codigo.strip().upper()
    existe = db.query(Moneda).filter(Moneda.codigo == codigo).first()
    if existe:
        raise HTTPException(status_code=400, detail="Ya existe una moneda con ese codigo")

    nueva = Moneda(codigo=codigo, nombre=datos.nombre.strip(), simbolo=datos.simbolo.strip())
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return {"mensaje": "Moneda creada", "moneda": moneda_a_dict(nueva)}

@router.put("/{moneda_id}")
def actualizar_moneda(
    moneda_id: int,
    datos: DatosMonedaActualizar,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_REPORTES_PAGO)),
):
    moneda = _buscar_moneda(db, moneda_id)

    if datos.codigo is not None:
        codigo = datos.codigo.strip().upper()
        repetido = db.query(Moneda).filter(Moneda.codigo == codigo, Moneda.id != moneda_id).first()
        if repetido:
            raise HTTPException(status_code=400, detail="Ya existe otra moneda con ese codigo")
        moneda.codigo = codigo

    if datos.nombre is not None:
        moneda.nombre = datos.nombre.strip()

    if datos.simbolo is not None:
        moneda.simbolo = datos.simbolo.strip()

    db.commit()
    db.refresh(moneda)
    return {"mensaje": "Moneda actualizada", "moneda": moneda_a_dict(moneda)}

@router.delete("/{moneda_id}")
def eliminar_moneda(
    moneda_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_BORRAR_REPORTES_PAGO)),
):
    moneda = _buscar_moneda(db, moneda_id)

    en_metodo = db.query(MetodoPago).filter(MetodoPago.moneda_id == moneda_id).first()
    if en_metodo:
        raise HTTPException(status_code=400, detail="No se puede eliminar: la moneda esta en uso por un metodo de pago")

    en_tasa = db.query(Tasa).filter(Tasa.moneda_id == moneda_id).first()
    if en_tasa:
        raise HTTPException(status_code=400, detail="No se puede eliminar: la moneda esta en uso por una tasa")

    db.delete(moneda)
    db.commit()
    return {"mensaje": "Moneda eliminada"}
