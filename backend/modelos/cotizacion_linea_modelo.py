from datetime import datetime
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import BigInteger, Column, DateTime, Enum, ForeignKey, Numeric, String
from sqlalchemy.orm import Session

from database import Base
from modelos.cotizacion_modelo import Cotizacion, obtener_cotizacion_activa


class CotizacionLinea(Base):
    __tablename__ = "cotizacion_lineas"

    id = Column(BigInteger, primary_key=True, index=True)
    cotizacion_id = Column(BigInteger, ForeignKey("cotizaciones.id"), nullable=False, index=True)
    categoria = Column(
        Enum("combustible", "logistica", "pago_guia", "alimentacion", "peajes", "otro"),
        nullable=False,
        default="otro",
    )
    monto_eur = Column(Numeric(12, 2), nullable=False)
    descripcion = Column(String(255), nullable=True)
    creado_en = Column(DateTime, nullable=False)
    actualizado_en = Column(DateTime, nullable=False)
    eliminado_en = Column(DateTime, nullable=True)


def linea_a_dict(linea: CotizacionLinea) -> dict:
    return {
        "id": linea.id,
        "cotizacion_id": linea.cotizacion_id,
        "categoria": linea.categoria,
        "monto_eur": float(linea.monto_eur),
        "descripcion": linea.descripcion,
    }


def recalcular_precio_cotizacion(db: Session, cotizacion: Cotizacion) -> None:
    lineas = db.query(CotizacionLinea).filter(
        CotizacionLinea.cotizacion_id == cotizacion.id,
        CotizacionLinea.eliminado_en.is_(None),
    ).all()
    if not lineas:
        return
    total = sum(float(l.monto_eur) for l in lineas)
    cotizacion.precio_cotizado_eur = Decimal(str(total))
    cotizacion.actualizado_en = datetime.now()


def listar_lineas_cotizacion(
    db: Session,
    cotizacion_id: int,
    usuario_actual: dict,
) -> list[dict]:
    from modelos.cotizacion_modelo import validar_acceso_cotizacion

    cotizacion = obtener_cotizacion_activa(db, cotizacion_id)
    validar_acceso_cotizacion(usuario_actual, cotizacion, db)

    lineas = db.query(CotizacionLinea).filter(
        CotizacionLinea.cotizacion_id == cotizacion_id,
        CotizacionLinea.eliminado_en.is_(None),
    ).order_by(CotizacionLinea.id).all()

    return [linea_a_dict(l) for l in lineas]


def resumen_lineas_cotizacion(
    db: Session,
    cotizacion_id: int,
    usuario_actual: dict,
) -> dict:
    from modelos.cotizacion_modelo import validar_acceso_cotizacion

    cotizacion = obtener_cotizacion_activa(db, cotizacion_id)
    validar_acceso_cotizacion(usuario_actual, cotizacion, db)

    lineas = db.query(CotizacionLinea).filter(
        CotizacionLinea.cotizacion_id == cotizacion_id,
        CotizacionLinea.eliminado_en.is_(None),
    ).all()

    por_categoria: dict[str, float] = {}
    for linea in lineas:
        cat = linea.categoria
        por_categoria[cat] = por_categoria.get(cat, 0) + float(linea.monto_eur)

    total = sum(por_categoria.values())
    return {
        "cotizacion_id": cotizacion_id,
        "total_eur": total,
        "por_categoria": [{"categoria": k, "monto_eur": v} for k, v in por_categoria.items()],
    }


def crear_linea_cotizacion(
    db: Session,
    cotizacion_id: int,
    categoria: str,
    monto_eur: Decimal,
    descripcion: Optional[str],
) -> tuple[CotizacionLinea, Cotizacion]:
    cotizacion = obtener_cotizacion_activa(db, cotizacion_id)
    if cotizacion.estado in ("aceptada", "cancelada"):
        raise HTTPException(status_code=400, detail="No se puede modificar el desglose en este estado")

    ahora = datetime.now()
    nueva_linea = CotizacionLinea(
        cotizacion_id=cotizacion_id,
        categoria=categoria,
        monto_eur=monto_eur,
        descripcion=descripcion,
        creado_en=ahora,
        actualizado_en=ahora,
    )
    db.add(nueva_linea)
    recalcular_precio_cotizacion(db, cotizacion)
    db.commit()
    db.refresh(nueva_linea)
    db.refresh(cotizacion)
    return nueva_linea, cotizacion


def actualizar_linea_cotizacion(
    db: Session,
    cotizacion_id: int,
    linea_id: int,
    categoria: Optional[str],
    monto_eur: Optional[Decimal],
    descripcion: Optional[str],
) -> tuple[CotizacionLinea, Cotizacion]:
    cotizacion = obtener_cotizacion_activa(db, cotizacion_id)
    if cotizacion.estado in ("aceptada", "cancelada"):
        raise HTTPException(status_code=400, detail="No se puede modificar el desglose en este estado")

    linea = db.query(CotizacionLinea).filter(
        CotizacionLinea.id == linea_id,
        CotizacionLinea.cotizacion_id == cotizacion_id,
        CotizacionLinea.eliminado_en.is_(None),
    ).first()
    if linea is None:
        raise HTTPException(status_code=404, detail="Línea no encontrada")

    if categoria is not None:
        linea.categoria = categoria
    if monto_eur is not None:
        linea.monto_eur = monto_eur
    if descripcion is not None:
        linea.descripcion = descripcion
    linea.actualizado_en = datetime.now()

    recalcular_precio_cotizacion(db, cotizacion)
    db.commit()
    db.refresh(linea)
    db.refresh(cotizacion)
    return linea, cotizacion


def eliminar_linea_cotizacion(
    db: Session,
    cotizacion_id: int,
    linea_id: int,
) -> Cotizacion:
    cotizacion = obtener_cotizacion_activa(db, cotizacion_id)
    linea = db.query(CotizacionLinea).filter(
        CotizacionLinea.id == linea_id,
        CotizacionLinea.cotizacion_id == cotizacion_id,
        CotizacionLinea.eliminado_en.is_(None),
    ).first()
    if linea is None:
        raise HTTPException(status_code=404, detail="Línea no encontrada")

    ahora = datetime.now()
    linea.eliminado_en = ahora
    linea.actualizado_en = ahora
    recalcular_precio_cotizacion(db, cotizacion)
    db.commit()
    db.refresh(cotizacion)
    return cotizacion
