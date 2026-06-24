from typing import Optional

from fastapi import HTTPException
from sqlalchemy import BigInteger, Column, ForeignKey, String
from sqlalchemy.orm import Session

from database import Base
from modelos.moneda_modelo import Moneda, moneda_a_dict, validar_moneda_existente
from utilidades.paginacion import paginar_consulta, respuesta_paginada


class MetodoPago(Base):
    __tablename__ = "metodos_pago"

    id = Column(BigInteger, primary_key=True, index=True)
    codigo = Column(String(40), unique=True, nullable=False)
    nombre = Column(String(120), nullable=False)
    moneda_id = Column(BigInteger, ForeignKey("monedas.id"), nullable=False, index=True)


def metodo_pago_a_dict(metodo: MetodoPago, moneda: Moneda) -> dict:
    return {
        "id": metodo.id,
        "codigo": metodo.codigo,
        "nombre": metodo.nombre,
        "moneda": moneda_a_dict(moneda),
    }


def obtener_metodo_pago(db: Session, metodo_id: int) -> MetodoPago:
    metodo = db.query(MetodoPago).filter(MetodoPago.id == metodo_id).first()
    if not metodo:
        raise HTTPException(status_code=404, detail="Metodo de pago no encontrado")
    return metodo


def metodo_pago_a_respuesta(db: Session, metodo: MetodoPago) -> dict:
    moneda = db.query(Moneda).filter(Moneda.id == metodo.moneda_id).first()
    if not moneda:
        raise HTTPException(status_code=500, detail="Moneda del metodo no encontrada")
    return metodo_pago_a_dict(metodo, moneda)


def listar_metodos_pago(db: Session, pagina: int = 1, limite: int = 10) -> dict:
    consulta = db.query(MetodoPago).order_by(MetodoPago.nombre)
    metodos, total = paginar_consulta(consulta, pagina, limite)
    items = [metodo_pago_a_respuesta(db, m) for m in metodos]
    return respuesta_paginada(items, total, pagina, limite)


def crear_metodo_pago(db: Session, codigo: str, nombre: str, moneda_id: int) -> MetodoPago:
    validar_moneda_existente(db, moneda_id)
    codigo_limpio = codigo.strip().lower()
    existe = db.query(MetodoPago).filter(MetodoPago.codigo == codigo_limpio).first()
    if existe:
        raise HTTPException(status_code=400, detail="Ya existe un metodo de pago con ese codigo")

    nuevo = MetodoPago(codigo=codigo_limpio, nombre=nombre.strip(), moneda_id=moneda_id)
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo


def actualizar_metodo_pago(
    db: Session,
    metodo_id: int,
    codigo: Optional[str],
    nombre: Optional[str],
    moneda_id: Optional[int],
) -> MetodoPago:
    metodo = obtener_metodo_pago(db, metodo_id)

    if moneda_id is not None:
        validar_moneda_existente(db, moneda_id)
        metodo.moneda_id = moneda_id

    if codigo is not None:
        codigo_limpio = codigo.strip().lower()
        repetido = db.query(MetodoPago).filter(
            MetodoPago.codigo == codigo_limpio,
            MetodoPago.id != metodo_id,
        ).first()
        if repetido:
            raise HTTPException(status_code=400, detail="Ya existe otro metodo con ese codigo")
        metodo.codigo = codigo_limpio

    if nombre is not None:
        metodo.nombre = nombre.strip()

    db.commit()
    db.refresh(metodo)
    return metodo


def eliminar_metodo_pago(db: Session, metodo_id: int) -> None:
    from modelos.pago_modelo import Pago

    metodo = obtener_metodo_pago(db, metodo_id)
    en_pago = db.query(Pago).filter(Pago.metodo_pago_id == metodo_id, Pago.eliminado_en.is_(None)).first()
    if en_pago:
        raise HTTPException(status_code=400, detail="No se puede eliminar: el metodo tiene pagos registrados")

    db.delete(metodo)
    db.commit()
