from datetime import date
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import BigInteger, Column, Date, ForeignKey, Numeric
from sqlalchemy.orm import Session

from database import Base
from modelos.moneda_modelo import (
    Moneda,
    buscar_moneda_por_codigo,
    moneda_a_dict,
    validar_moneda_existente,
)
from utilidades.paginacion import paginar_consulta, respuesta_paginada


class Tasa(Base):
    __tablename__ = "tasas"

    id = Column(BigInteger, primary_key=True, index=True)
    fecha = Column(Date, nullable=False, index=True)
    valor = Column(Numeric(14, 4), nullable=False)
    moneda_id = Column(BigInteger, ForeignKey("monedas.id"), nullable=False, index=True)


def tasa_a_dict(tasa: Tasa, moneda: Moneda) -> dict:
    return {
        "id": tasa.id,
        "fecha": tasa.fecha.isoformat() if tasa.fecha else None,
        "valor": float(tasa.valor),
        "moneda": moneda_a_dict(moneda),
    }


def obtener_tasa_eur_reciente(db: Session) -> tuple[Tasa, Moneda] | None:
    moneda_eur = buscar_moneda_por_codigo(db, "EUR")
    if not moneda_eur:
        return None

    tasa = (
        db.query(Tasa)
        .filter(Tasa.moneda_id == moneda_eur.id)
        .order_by(Tasa.fecha.desc(), Tasa.id.desc())
        .first()
    )
    if not tasa:
        return None

    return tasa, moneda_eur


def obtener_tasa_eur_del_dia(db: Session) -> dict | None:
    moneda_eur = buscar_moneda_por_codigo(db, "EUR")
    if not moneda_eur:
        return None

    hoy = date.today()
    tasa_hoy = (
        db.query(Tasa)
        .filter(Tasa.moneda_id == moneda_eur.id, Tasa.fecha == hoy)
        .order_by(Tasa.id.desc())
        .first()
    )

    if tasa_hoy:
        return {
            "tasa": tasa_a_dict(tasa_hoy, moneda_eur),
            "fecha": hoy.isoformat(),
            "valor": float(tasa_hoy.valor),
            "es_del_dia": True,
        }

    tasa_reciente = obtener_tasa_eur_reciente(db)
    if not tasa_reciente:
        return None

    tasa, moneda = tasa_reciente
    return {
        "tasa": tasa_a_dict(tasa, moneda),
        "fecha": tasa.fecha.isoformat() if tasa.fecha else None,
        "valor": float(tasa.valor),
        "es_del_dia": False,
    }


def obtener_tasa(db: Session, tasa_id: int) -> Tasa:
    tasa = db.query(Tasa).filter(Tasa.id == tasa_id).first()
    if not tasa:
        raise HTTPException(status_code=404, detail="Tasa no encontrada")
    return tasa


def tasa_a_respuesta(db: Session, tasa: Tasa) -> dict:
    moneda = db.query(Moneda).filter(Moneda.id == tasa.moneda_id).first()
    if not moneda:
        raise HTTPException(status_code=500, detail="Moneda de la tasa no encontrada")
    return tasa_a_dict(tasa, moneda)


def listar_tasas(
    db: Session,
    moneda_id: Optional[int] = None,
    fecha: Optional[date] = None,
    pagina: int = 1,
    limite: int = 10,
) -> dict:
    consulta = db.query(Tasa)
    if moneda_id is not None:
        consulta = consulta.filter(Tasa.moneda_id == moneda_id)
    if fecha is not None:
        consulta = consulta.filter(Tasa.fecha == fecha)

    consulta = consulta.order_by(Tasa.fecha.desc(), Tasa.id.desc())
    tasas, total = paginar_consulta(consulta, pagina, limite)
    items = [tasa_a_respuesta(db, t) for t in tasas]
    return respuesta_paginada(items, total, pagina, limite)


def obtener_tasa_eur_del_dia_o_error(db: Session) -> dict:
    resultado = obtener_tasa_eur_del_dia(db)
    if resultado is None:
        raise HTTPException(status_code=404, detail="No hay tasa EUR registrada en el sistema")
    return resultado


def listar_tasas_hoy(db: Session, pagina: int = 1, limite: int = 10) -> dict:
    hoy = date.today()
    consulta = (
        db.query(Tasa)
        .filter(Tasa.fecha == hoy)
        .order_by(Tasa.id.desc())
    )
    tasas, total = paginar_consulta(consulta, pagina, limite)
    items = [tasa_a_respuesta(db, t) for t in tasas]
    return respuesta_paginada(items, total, pagina, limite)


def crear_tasa(db: Session, fecha: date, valor: Decimal, moneda_id: int) -> Tasa:
    validar_moneda_existente(db, moneda_id)
    nueva = Tasa(fecha=fecha, valor=valor, moneda_id=moneda_id)
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return nueva


def actualizar_tasa(
    db: Session,
    tasa_id: int,
    fecha: Optional[date],
    valor: Optional[Decimal],
    moneda_id: Optional[int],
) -> Tasa:
    tasa = obtener_tasa(db, tasa_id)

    if moneda_id is not None:
        validar_moneda_existente(db, moneda_id)
        tasa.moneda_id = moneda_id

    if fecha is not None:
        tasa.fecha = fecha

    if valor is not None:
        tasa.valor = valor

    db.commit()
    db.refresh(tasa)
    return tasa


def eliminar_tasa(db: Session, tasa_id: int) -> None:
    from modelos.pago_modelo import Pago

    tasa = obtener_tasa(db, tasa_id)
    en_pago = db.query(Pago).filter(Pago.tasa_id == tasa_id, Pago.eliminado_en.is_(None)).first()
    if en_pago:
        raise HTTPException(status_code=400, detail="No se puede eliminar: la tasa esta en uso por un pago")

    db.delete(tasa)
    db.commit()
