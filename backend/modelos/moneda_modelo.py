from typing import Optional

from fastapi import HTTPException
from sqlalchemy import BigInteger, Column, String
from sqlalchemy.orm import Session

from database import Base
from utilidades.paginacion import offset_pagina, paginar_consulta, respuesta_paginada


class Moneda(Base):
    __tablename__ = "monedas"

    id = Column(BigInteger, primary_key=True, index=True)
    codigo = Column(String(10), unique=True, nullable=False)
    nombre = Column(String(60), nullable=False)
    simbolo = Column(String(10), nullable=False)


def moneda_a_dict(moneda: Moneda) -> dict:
    return {
        "id": moneda.id,
        "codigo": moneda.codigo,
        "nombre": moneda.nombre,
        "simbolo": moneda.simbolo,
    }


def buscar_moneda_por_id(db: Session, moneda_id: int) -> Moneda | None:
    return db.query(Moneda).filter(Moneda.id == moneda_id).first()


def buscar_moneda_por_codigo(db: Session, codigo: str) -> Moneda | None:
    return db.query(Moneda).filter(Moneda.codigo == codigo).first()


def obtener_moneda(db: Session, moneda_id: int) -> Moneda:
    moneda = db.query(Moneda).filter(Moneda.id == moneda_id).first()
    if not moneda:
        raise HTTPException(status_code=404, detail="Moneda no encontrada")
    return moneda


def listar_monedas(db: Session, pagina: int = 1, limite: int = 10) -> dict:
    consulta = db.query(Moneda).order_by(Moneda.nombre)
    monedas, total = paginar_consulta(consulta, pagina, limite)
    items = [moneda_a_dict(m) for m in monedas]
    return respuesta_paginada(items, total, pagina, limite)


def crear_moneda(db: Session, codigo: str, nombre: str, simbolo: str) -> Moneda:
    codigo_limpio = codigo.strip().upper()
    existe = db.query(Moneda).filter(Moneda.codigo == codigo_limpio).first()
    if existe:
        raise HTTPException(status_code=400, detail="Ya existe una moneda con ese codigo")

    nueva = Moneda(codigo=codigo_limpio, nombre=nombre.strip(), simbolo=simbolo.strip())
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return nueva


def actualizar_moneda(
    db: Session,
    moneda_id: int,
    codigo: Optional[str],
    nombre: Optional[str],
    simbolo: Optional[str],
) -> Moneda:
    moneda = obtener_moneda(db, moneda_id)

    if codigo is not None:
        codigo_limpio = codigo.strip().upper()
        repetido = db.query(Moneda).filter(Moneda.codigo == codigo_limpio, Moneda.id != moneda_id).first()
        if repetido:
            raise HTTPException(status_code=400, detail="Ya existe otra moneda con ese codigo")
        moneda.codigo = codigo_limpio

    if nombre is not None:
        moneda.nombre = nombre.strip()

    if simbolo is not None:
        moneda.simbolo = simbolo.strip()

    db.commit()
    db.refresh(moneda)
    return moneda


def eliminar_moneda(db: Session, moneda_id: int) -> None:
    from modelos.metodo_pago_modelo import MetodoPago
    from modelos.tasa_modelo import Tasa

    obtener_moneda(db, moneda_id)

    en_metodo = db.query(MetodoPago).filter(MetodoPago.moneda_id == moneda_id).first()
    if en_metodo:
        raise HTTPException(status_code=400, detail="No se puede eliminar: la moneda esta en uso por un metodo de pago")

    en_tasa = db.query(Tasa).filter(Tasa.moneda_id == moneda_id).first()
    if en_tasa:
        raise HTTPException(status_code=400, detail="No se puede eliminar: la moneda esta en uso por una tasa")

    moneda = obtener_moneda(db, moneda_id)
    db.delete(moneda)
    db.commit()


def validar_moneda_existente(db: Session, moneda_id: int) -> Moneda:
    moneda = db.query(Moneda).filter(Moneda.id == moneda_id).first()
    if not moneda:
        raise HTTPException(status_code=400, detail="Moneda invalida")
    return moneda
