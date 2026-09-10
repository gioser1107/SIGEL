from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import BigInteger, Column, Date, DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import Session

from database import Base
from modelos.moneda_modelo import (
    Moneda,
    buscar_moneda_por_codigo,
    buscar_moneda_por_id,
    moneda_a_dict,
    validar_moneda_existente,
)
from utilidades.fecha_operativa import fecha_operativa_hoy
from utilidades.paginacion import paginar_consulta, respuesta_paginada
from utilidades.validaciones import ValidadorEntrada


class Tasa(Base):
    __tablename__ = "tasas"

    id = Column(BigInteger, primary_key=True, index=True)
    fecha = Column(Date, nullable=False, index=True)
    valor = Column(Numeric(14, 4), nullable=False)
    moneda_id = Column(BigInteger, ForeignKey("monedas.id"), nullable=False, index=True)
    origen = Column(String(20), nullable=False, default="manual")
    eliminado_en = Column(DateTime, nullable=True)

ORIGEN_MANUAL = "manual"
ORIGEN_BCV = "bcv"


def tasa_a_dict(tasa: Tasa, moneda: Moneda) -> dict:
    return {
        "id": tasa.id,
        "fecha": tasa.fecha.isoformat() if tasa.fecha else None,
        "valor": float(tasa.valor),
        "origen": tasa.origen or ORIGEN_MANUAL,
        "moneda": moneda_a_dict(moneda),
    }


def obtener_tasa_moneda_en_o_antes(
    db: Session,
    moneda_id: int,
    fecha: Optional[date] = None,
) -> Tasa | None:
    limite = fecha or fecha_operativa_hoy()
    return (
        db.query(Tasa)
        .filter(
            Tasa.moneda_id == moneda_id,
            Tasa.fecha <= limite,
            Tasa.eliminado_en.is_(None),
        )
        .order_by(Tasa.fecha.desc(), Tasa.id.desc())
        .first()
    )


def obtener_tasa_eur_reciente(db: Session) -> tuple[Tasa, Moneda] | None:
    moneda_eur = buscar_moneda_por_codigo(db, "EUR")
    if not moneda_eur:
        return None

    tasa = obtener_tasa_moneda_en_o_antes(db, moneda_eur.id)
    if not tasa:
        return None

    return tasa, moneda_eur


def obtener_tasa_eur_del_dia(db: Session) -> dict | None:
    moneda_eur = buscar_moneda_por_codigo(db, "EUR")
    if not moneda_eur:
        return None

    hoy = fecha_operativa_hoy()
    tasa_hoy = (
        db.query(Tasa)
        .filter(
            Tasa.moneda_id == moneda_eur.id,
            Tasa.fecha == hoy,
            Tasa.eliminado_en.is_(None),
        )
        .order_by(Tasa.id.desc())
        .first()
    )

    if not tasa_hoy:
        return None

    return {
        "tasa": tasa_a_dict(tasa_hoy, moneda_eur),
        "fecha": hoy.isoformat(),
        "valor": float(tasa_hoy.valor),
        "es_del_dia": True,
    }


def obtener_tasa(db: Session, tasa_id: int) -> Tasa:
    tasa = db.query(Tasa).filter(
        Tasa.id == tasa_id,
        Tasa.eliminado_en.is_(None),
    ).first()
    if not tasa:
        raise HTTPException(status_code=404, detail="Tasa no encontrada")
    return tasa


def tasa_a_respuesta(db: Session, tasa: Tasa) -> dict:
    moneda = buscar_moneda_por_id(db, tasa.moneda_id)
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
    consulta = db.query(Tasa).filter(Tasa.eliminado_en.is_(None))
    if moneda_id is not None:
        consulta = consulta.filter(Tasa.moneda_id == moneda_id)
    if fecha is not None:
        consulta = consulta.filter(Tasa.fecha == fecha)

    consulta = consulta.order_by(Tasa.fecha.desc(), Tasa.id.desc())
    tasas, total = paginar_consulta(consulta, pagina, limite)
    items = [tasa_a_respuesta(db, t) for t in tasas]
    return respuesta_paginada(items, total, pagina, limite)


def obtener_tasa_eur_del_dia_o_error(db: Session) -> dict:
    hoy = fecha_operativa_hoy()
    moneda_eur = buscar_moneda_por_codigo(db, "EUR")
    if not moneda_eur:
        raise HTTPException(status_code=503, detail="Moneda EUR no configurada en el sistema")

    resultado = obtener_tasa_eur_del_dia(db)
    if resultado is None:
        raise HTTPException(
            status_code=503,
            detail=(
                f"No hay tasa EUR cargada para el dia de hoy ({hoy.isoformat()}). "
                "Registre la tasa del dia antes de continuar."
            ),
        )
    return resultado


def validar_tasa_eur_es_del_dia(db: Session, tasa_id: int) -> Tasa:
    tasa = obtener_tasa(db, tasa_id)
    moneda = buscar_moneda_por_id(db, tasa.moneda_id)
    if not moneda or moneda.codigo != "EUR":
        raise HTTPException(
            status_code=400,
            detail="La tasa indicada debe ser la tasa EUR del dia de hoy",
        )

    hoy = fecha_operativa_hoy()
    if tasa.fecha != hoy:
        raise HTTPException(
            status_code=503,
            detail=(
                f"No hay tasa EUR cargada para el dia de hoy ({hoy.isoformat()}). "
                "Registre la tasa del dia antes de continuar."
            ),
        )

    return tasa


def listar_tasas_hoy(db: Session, pagina: int = 1, limite: int = 10) -> dict:
    hoy = fecha_operativa_hoy()
    consulta = (
        db.query(Tasa)
        .filter(Tasa.fecha == hoy, Tasa.eliminado_en.is_(None))
        .order_by(Tasa.id.desc())
    )
    tasas, total = paginar_consulta(consulta, pagina, limite)
    items = [tasa_a_respuesta(db, t) for t in tasas]
    return respuesta_paginada(items, total, pagina, limite)


def crear_tasa(
    db: Session,
    fecha: date,
    valor: Decimal,
    moneda_id: int,
    origen: str = ORIGEN_MANUAL,
    permitir_fecha_futura: bool = False,
) -> Tasa:
    if not permitir_fecha_futura:
        ValidadorEntrada.fecha_no_futura(fecha, "fecha", obligatorio=True)
    validar_moneda_existente(db, moneda_id)
    nueva = Tasa(fecha=fecha, valor=valor, moneda_id=moneda_id, origen=origen)
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return nueva


def _tasa_del_dia_moneda(db: Session, moneda_id: int, fecha: date) -> Tasa | None:
    return (
        db.query(Tasa)
        .filter(
            Tasa.moneda_id == moneda_id,
            Tasa.fecha == fecha,
            Tasa.eliminado_en.is_(None),
        )
        .order_by(Tasa.id.desc())
        .first()
    )


def upsert_tasa_del_dia(
    db: Session,
    fecha: date,
    valor: Decimal,
    moneda_id: int,
    origen: str,
) -> tuple[Tasa, bool]:
    existente = _tasa_del_dia_moneda(db, moneda_id, fecha)
    if existente:
        existente.valor = valor
        existente.origen = origen
        db.commit()
        db.refresh(existente)
        return existente, True
    return crear_tasa(
        db,
        fecha,
        valor,
        moneda_id,
        origen=origen,
        permitir_fecha_futura=(origen == ORIGEN_BCV),
    ), False


def sincronizar_tasas_bcv(
    db: Session,
    solo_si_falta: bool = False,
    fecha_efectiva: Optional[date] = None,
) -> dict:
    from utilidades.tasa_bcv import consultar_tasas_oficiales_bcv

    fecha = fecha_efectiva or fecha_operativa_hoy()
    moneda_eur = buscar_moneda_por_codigo(db, "EUR")
    if not moneda_eur:
        raise HTTPException(status_code=503, detail="Moneda EUR no configurada en el sistema")

    if solo_si_falta and _tasa_del_dia_moneda(db, moneda_eur.id, fecha):
        return {
            "omitido": True,
            "mensaje": f"Ya hay tasa EUR para {fecha.isoformat()}. No se consultó el BCV.",
            "tasas": [],
        }

    oficiales = consultar_tasas_oficiales_bcv()
    creadas = []
    for codigo, valor in oficiales.items():
        moneda = buscar_moneda_por_codigo(db, codigo)
        if not moneda:
            continue
        tasa, actualizada = upsert_tasa_del_dia(db, fecha, valor, moneda.id, ORIGEN_BCV)
        creadas.append({"tasa": tasa_a_dict(tasa, moneda), "actualizada": actualizada})

    if not creadas:
        raise HTTPException(status_code=503, detail="No hay monedas EUR/USD para guardar la tasa BCV")

    return {
        "omitido": False,
        "mensaje": f"Tasa oficial BCV cargada para {fecha.isoformat()}.",
        "tasas": [item["tasa"] for item in creadas],
    }


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
        ValidadorEntrada.fecha_no_futura(fecha, "fecha")
        tasa.fecha = fecha

    if valor is not None:
        tasa.valor = valor
        tasa.origen = ORIGEN_MANUAL

    db.commit()
    db.refresh(tasa)
    return tasa


def eliminar_tasa(db: Session, tasa_id: int) -> None:
    from modelos.pago_modelo import Pago

    tasa = obtener_tasa(db, tasa_id)
    en_pago = db.query(Pago).filter(Pago.tasa_id == tasa_id, Pago.eliminado_en.is_(None)).first()
    if en_pago:
        raise HTTPException(status_code=400, detail="No se puede eliminar: la tasa esta en uso por un pago")

    ahora = datetime.now()
    tasa.eliminado_en = ahora
    db.commit()
